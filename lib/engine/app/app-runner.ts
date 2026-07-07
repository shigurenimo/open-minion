import { z } from "zod"
import { safeJsonParse } from "../errors.ts"
import type { MinionFileSystem } from "../fs/file-system.ts"
import type { MinionProcessRunner } from "../process/process-runner.ts"
import type { MinionPaths } from "./app-paths.ts"
import { computeSourceHash } from "./source-hash.ts"

export type MinionBuildKind = "debug" | "release"

/** Progress notification emitted while `start()` runs. Presentation belongs to the caller. */
export type MinionAppEvent = { type: "build-start"; build: MinionBuildKind }

export type MinionStartResult =
  | { kind: "started"; pid: number }
  | { kind: "already-running"; pid: number }
  | { kind: "build-failed"; build: MinionBuildKind }
  | { kind: "lock-conflict" }

export type MinionKillResult = { kind: "killed"; pid: number } | { kind: "not-running" }

export type MinionProcessStatus = {
  running: boolean
  /** Last recorded pid, if a pid file exists — may belong to a dead process when `running` is false. */
  pid: number | null
}

export type MinionAppStatus = {
  app: MinionProcessStatus
  gateway: MinionProcessStatus
}

export type MinionStartOptions = {
  /** Build and run the debug binary instead of the cached release build. */
  debug?: boolean
}

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  paths: MinionPaths
  /** Command used to launch the gateway daemon, e.g. `[process.execPath, "/path/to/gateway-daemon.js"]`. */
  gatewayCommand: string[]
  /** Progress events (build started, ...). Defaults to a no-op — the library never writes to stdout itself. */
  onEvent?: (event: MinionAppEvent) => void
}

const buildDataSchema = z.object({ sourceHash: z.string() })

type BuildData = z.infer<typeof buildDataSchema>

/**
 * Build/start/kill/status for the Swift app and its companion gateway daemon.
 *
 * Expected outcomes ("already running", "build failed", ...) come back as
 * `MinionStartResult` / `MinionKillResult` kinds; unexpected IO failures
 * (unwritable state dir, missing executable, ...) come back as an `Error`
 * value. Nothing throws.
 */
export class MinionAppRunner {
  private readonly fs: MinionFileSystem
  private readonly process: MinionProcessRunner
  private readonly paths: MinionPaths
  private readonly gatewayCommand: string[]
  private readonly onEvent: (event: MinionAppEvent) => void

  constructor(props: Props) {
    this.fs = props.fs
    this.process = props.process
    this.paths = props.paths
    this.gatewayCommand = props.gatewayCommand
    this.onEvent = props.onEvent ?? (() => {})
  }

  async start(options: MinionStartOptions = {}): Promise<MinionStartResult | Error> {
    const debug = options.debug ?? false

    const existingPid = this.readPid(this.paths.pidFile)
    if (existingPid !== null) {
      if (this.process.isAlive(existingPid)) {
        return { kind: "already-running", pid: existingPid }
      }
      const rmError = this.fs.rmSync(this.paths.pidFile, { force: true })
      if (rmError) return rmError
    }

    const lock = this.acquireStartLock()
    if (lock instanceof Error) return lock
    if (!lock) return { kind: "lock-conflict" }

    const build: MinionBuildKind = debug ? "debug" : "release"
    const binPath = debug ? this.paths.debugBinPath : this.paths.binPath

    if (debug) {
      const built = await this.build(build)
      if (built !== true) return this.releaseLockAfter(built, build)
    } else {
      // A hash failure (unreadable source tree) just means "hash unknown":
      // build unconditionally and skip recording, so the next start re-checks.
      const currentHash = computeSourceHash({ fs: this.fs, appRoot: this.paths.appRoot })
      const buildData = this.readBuildData()
      if (!this.fs.existsSync(binPath) || buildData?.sourceHash !== currentHash) {
        const built = await this.build(build)
        if (built !== true) return this.releaseLockAfter(built, build)
        if (typeof currentHash === "string") {
          const writeError = this.writeBuildData({ sourceHash: currentHash })
          if (writeError) return this.releaseLockAfter(writeError, build)
        }
      }
    }

    const pid = this.process.spawnDetached([binPath], { cwd: this.paths.appRoot })
    if (pid instanceof Error) return this.releaseLockAfter(pid, build)

    const pidWriteError = this.fs.writeFileSync(this.paths.pidFile, String(pid))
    if (pidWriteError) {
      // Untracked would mean unkillable — take the app back down.
      this.process.kill(pid, "SIGTERM")
      return this.releaseLockAfter(pidWriteError, build)
    }

    const gatewayError = this.startGateway()
    if (gatewayError) return gatewayError

    return { kind: "started", pid }
  }

  kill(): MinionKillResult | Error {
    const gatewayError = this.killGateway()
    if (gatewayError) return gatewayError

    const pid = this.readPid(this.paths.pidFile)
    if (!pid || !this.process.isAlive(pid)) {
      if (this.fs.existsSync(this.paths.pidFile)) {
        const rmError = this.fs.rmSync(this.paths.pidFile, { force: true })
        if (rmError) return rmError
      }
      return { kind: "not-running" }
    }

    this.process.kill(pid, "SIGTERM")
    const rmError = this.fs.rmSync(this.paths.pidFile, { force: true })
    if (rmError) return rmError
    return { kind: "killed", pid }
  }

  status(): MinionAppStatus {
    return {
      app: this.processStatus(this.paths.pidFile),
      gateway: this.processStatus(this.paths.gatewayPidFile),
    }
  }

  private processStatus(pidFile: string): MinionProcessStatus {
    const pid = this.readPid(pidFile)
    return { running: pid !== null && this.process.isAlive(pid), pid }
  }

  /** `true` on success, `{kind: "build-failed"}`-worthy `false` on a nonzero exit, `Error` when the build tool couldn't run at all. */
  private async build(build: MinionBuildKind): Promise<true | false | Error> {
    this.onEvent({ type: "build-start", build })
    const args =
      build === "debug"
        ? ["swift", "build", "--scratch-path", this.paths.buildPath]
        : ["swift", "build", "-c", "release", "--scratch-path", this.paths.buildPath]

    const exitCode = await this.process.runInherit(args, { cwd: this.paths.appRoot })
    if (exitCode instanceof Error) return exitCode
    return exitCode === 0
  }

  /** Removes the start-lock pid file, then maps a mid-start failure to its result/Error. */
  private releaseLockAfter(
    failure: false | Error,
    build: MinionBuildKind,
  ): MinionStartResult | Error {
    this.fs.rmSync(this.paths.pidFile, { force: true })
    return failure === false ? { kind: "build-failed", build } : failure
  }

  private startGateway(): Error | null {
    const pid = this.readPid(this.paths.gatewayPidFile)
    if (pid !== null && this.process.isAlive(pid)) return null

    const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    if (mkdirError) return mkdirError

    const spawnedPid = this.process.spawnDetached(this.gatewayCommand)
    if (spawnedPid instanceof Error) return spawnedPid

    const writeError = this.fs.writeFileSync(this.paths.gatewayPidFile, String(spawnedPid))
    if (writeError) {
      this.process.kill(spawnedPid, "SIGTERM")
      return writeError
    }
    return null
  }

  private killGateway(): Error | null {
    const pid = this.readPid(this.paths.gatewayPidFile)
    if (pid !== null && this.process.isAlive(pid)) {
      this.process.kill(pid, "SIGTERM")
    }
    return this.fs.rmSync(this.paths.gatewayPidFile, { force: true })
  }

  private acquireStartLock(): boolean | Error {
    const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    if (mkdirError) return mkdirError
    return this.fs.createExclusiveSync(this.paths.pidFile)
  }

  private readPid(pidFile: string): number | null {
    if (!this.fs.existsSync(pidFile)) return null
    const content = this.fs.readFileSync(pidFile)
    if (content instanceof Error) return null
    const pid = Number.parseInt(content.trim(), 10)
    return Number.isNaN(pid) ? null : pid
  }

  private readBuildData(): BuildData | null {
    if (!this.fs.existsSync(this.paths.dataFile)) return null
    const content = this.fs.readFileSync(this.paths.dataFile)
    if (content instanceof Error) return null
    const json = safeJsonParse(content)
    if (json instanceof Error) return null
    const parsed = buildDataSchema.safeParse(json)
    return parsed.success ? parsed.data : null
  }

  private writeBuildData(data: BuildData): Error | null {
    const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    if (mkdirError) return mkdirError
    return this.fs.writeFileSync(this.paths.dataFile, JSON.stringify(data, null, 2))
  }
}
