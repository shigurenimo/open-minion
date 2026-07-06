import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import type { MinionProcessRunner } from "@lib/engine/process/process-runner"
import type { MinionPaths } from "@lib/engine/app/app-paths"
import { computeSourceHash } from "@lib/engine/app/source-hash"

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  paths: MinionPaths
  /** Command used to launch the gateway daemon, e.g. `["bun", "/path/to/gateway-daemon.ts"]`. */
  gatewayCommand: string[]
}

type BuildData = {
  sourceHash: string
}

/** Build/start/kill/status for the Swift app and its companion gateway daemon. */
export class MinionAppRunner {
  private readonly fs: MinionFileSystem
  private readonly process: MinionProcessRunner
  private readonly paths: MinionPaths
  private readonly gatewayCommand: string[]

  constructor(props: Props) {
    this.fs = props.fs
    this.process = props.process
    this.paths = props.paths
    this.gatewayCommand = props.gatewayCommand
  }

  async start(debug: boolean): Promise<string> {
    const existingPid = this.readPid(this.paths.pidFile)
    if (existingPid !== null) {
      if (this.process.isAlive(existingPid)) {
        return `すでに起動中 (pid ${existingPid})`
      }
      this.fs.rmSync(this.paths.pidFile, { force: true })
    }

    if (!this.acquireStartLock()) {
      return "他の起動処理と競合したため中止"
    }

    const binPath = debug ? this.paths.debugBinPath : this.paths.binPath

    if (debug) {
      if (!(await this.build(true))) {
        this.fs.rmSync(this.paths.pidFile, { force: true })
        return "ビルド失敗"
      }
    } else {
      const currentHash = computeSourceHash({ fs: this.fs, appRoot: this.paths.appRoot })
      const buildData = this.readBuildData()
      if (!this.fs.existsSync(binPath) || buildData?.sourceHash !== currentHash) {
        if (!(await this.build(false))) {
          this.fs.rmSync(this.paths.pidFile, { force: true })
          return "ビルド失敗"
        }
        this.writeBuildData({ sourceHash: currentHash })
      }
    }

    const pid = this.process.spawnDetached([binPath], { cwd: this.paths.appRoot })
    this.fs.writeFileSync(this.paths.pidFile, String(pid))
    this.startGateway()
    return `起動した (pid ${pid})`
  }

  kill(): string {
    this.killGateway()

    const pid = this.readPid(this.paths.pidFile)
    if (!pid || !this.process.isAlive(pid)) {
      if (this.fs.existsSync(this.paths.pidFile))
        this.fs.rmSync(this.paths.pidFile, { force: true })
      return "起動していない"
    }

    this.process.kill(pid, "SIGTERM")
    this.fs.rmSync(this.paths.pidFile, { force: true })
    return `停止した (pid ${pid})`
  }

  status(): string {
    const pid = this.readPid(this.paths.pidFile)
    const appLine = pid && this.process.isAlive(pid) ? `起動中 (pid ${pid})` : "停止中"

    const gatewayPid = this.readPid(this.paths.gatewayPidFile)
    const gatewayLine =
      gatewayPid && this.process.isAlive(gatewayPid)
        ? `gateway起動中 (pid ${gatewayPid})`
        : "gateway停止中"

    return [appLine, gatewayLine].join("\n")
  }

  private async build(debug: boolean): Promise<boolean> {
    console.log("ビルド中...")
    const args = debug
      ? ["swift", "build", "--scratch-path", this.paths.buildPath]
      : ["swift", "build", "-c", "release", "--scratch-path", this.paths.buildPath]

    const exitCode = await this.process.runInherit(args, { cwd: this.paths.appRoot })
    if (exitCode !== 0) {
      console.error("ビルド失敗")
      return false
    }
    return true
  }

  private startGateway(): void {
    const pid = this.readPid(this.paths.gatewayPidFile)
    if (pid !== null && this.process.isAlive(pid)) return

    this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    const spawnedPid = this.process.spawnDetached(this.gatewayCommand)
    this.fs.writeFileSync(this.paths.gatewayPidFile, String(spawnedPid))
  }

  private killGateway(): void {
    const pid = this.readPid(this.paths.gatewayPidFile)
    if (pid !== null && this.process.isAlive(pid)) {
      this.process.kill(pid, "SIGTERM")
    }
    this.fs.rmSync(this.paths.gatewayPidFile, { force: true })
  }

  private acquireStartLock(): boolean {
    this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    return this.fs.createExclusiveSync(this.paths.pidFile)
  }

  private readPid(pidFile: string): number | null {
    if (!this.fs.existsSync(pidFile)) return null
    const pid = Number.parseInt(this.fs.readFileSync(pidFile).trim(), 10)
    return Number.isNaN(pid) ? null : pid
  }

  private readBuildData(): BuildData | null {
    if (!this.fs.existsSync(this.paths.dataFile)) return null
    try {
      return JSON.parse(this.fs.readFileSync(this.paths.dataFile))
    } catch {
      return null
    }
  }

  private writeBuildData(data: BuildData): void {
    this.fs.mkdirSync(this.paths.dataDir, { recursive: true })
    this.fs.writeFileSync(this.paths.dataFile, JSON.stringify(data, null, 2))
  }
}
