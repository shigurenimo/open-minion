import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { resolveMinionPaths } from "@lib/engine/app/app-paths"
import { type MinionAppEvent, MinionAppRunner } from "@lib/engine/app/app-runner"

function setup(files: Record<string, string> = {}) {
  const fs = new MemoryMinionFileSystem({
    files: { "/pkg/swift/Package.swift": "// package", ...files },
  })
  const process = new MemoryMinionProcessRunner()
  const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
  const events: MinionAppEvent[] = []
  const runner = new MinionAppRunner({
    fs,
    process,
    paths,
    gatewayCommand: ["bun", "/pkg/gateway.ts"],
    onEvent: (event) => events.push(event),
  })
  return { fs, process, paths, runner, events }
}

describe("MinionAppRunner.start", () => {
  it("builds and spawns on first release start, and spawns the gateway", async () => {
    const { fs, process, paths, runner, events } = setup()

    const result = await runner.start()

    expect(result).toEqual({ kind: "started", pid: expect.any(Number) })
    expect(events).toEqual([{ type: "build-start", build: "release" }])
    expect(fs.existsSync(paths.pidFile)).toBe(true)
    expect(fs.existsSync(paths.gatewayPidFile)).toBe(true)
    expect(process.calls.some((c) => c.kind === "runInherit")).toBe(true)
    expect(process.calls.some((c) => c.kind === "spawnDetached" && c.command[0] === "bun")).toBe(
      true,
    )
  })

  it("does nothing when already running", async () => {
    const { process, runner } = setup()
    process.onIsAlive(() => true)

    const first = await runner.start()
    expect(first).toEqual({ kind: "started", pid: expect.any(Number) })

    const second = await runner.start()
    expect(second).toEqual({ kind: "already-running", pid: expect.any(Number) })
  })

  it("refuses to start when the lock is already held by a concurrent call", async () => {
    const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
    const fs = new MemoryMinionFileSystem({
      files: { "/pkg/swift/Package.swift": "// package", [paths.pidFile]: "" },
    })
    const runner = new MinionAppRunner({
      fs,
      process: new MemoryMinionProcessRunner(),
      paths,
      gatewayCommand: ["bun", "/pkg/gateway.ts"],
    })

    const result = await runner.start()

    expect(result).toEqual({ kind: "lock-conflict" })
  })

  it("reports build failure and clears the lock", async () => {
    const { fs, process, paths, runner } = setup()
    process.onRunInherit(() => 1)

    const result = await runner.start()

    expect(result).toEqual({ kind: "build-failed", build: "release" })
    expect(fs.existsSync(paths.pidFile)).toBe(false)
  })

  it("skips rebuilding when the binary exists and the source hash is unchanged", async () => {
    const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
    const fs = new MemoryMinionFileSystem({
      files: {
        "/pkg/swift/Package.swift": "// package",
        [paths.binPath]: "binary",
      },
    })
    const process = new MemoryMinionProcessRunner()
    const runner = new MinionAppRunner({ fs, process, paths, gatewayCommand: ["bun", "gw"] })

    // Prime the recorded build hash by doing a full build once (data.json doesn't exist yet).
    await runner.start()
    process.calls.length = 0
    fs.rmSync(paths.pidFile, { force: true })
    fs.rmSync(paths.gatewayPidFile, { force: true })

    await runner.start()

    expect(process.calls.some((c) => c.kind === "runInherit")).toBe(false)
  })

  it("always rebuilds in debug mode regardless of the source hash", async () => {
    const { process, runner } = setup()

    await runner.start({ debug: true })
    process.calls.length = 0
    runner.kill()

    await runner.start({ debug: true })

    expect(process.calls.some((c) => c.kind === "runInherit")).toBe(true)
  })

  it("does not spawn a second gateway when one is already alive", async () => {
    const { process, runner } = setup()

    await runner.start() // app pid 1001, gateway pid 1002 (default incrementing stub)
    process.onIsAlive((pid) => pid === 1002) // gateway still alive, app pid considered dead
    const gatewaySpawnsBefore = process.calls.filter(
      (c) => c.kind === "spawnDetached" && c.command[0] === "bun",
    ).length

    await runner.start()

    const gatewaySpawnsAfter = process.calls.filter(
      (c) => c.kind === "spawnDetached" && c.command[0] === "bun",
    ).length
    expect(gatewaySpawnsAfter).toBe(gatewaySpawnsBefore)
  })
})

describe("MinionAppRunner.kill", () => {
  it("reports not running when there is no pid file", () => {
    const { runner } = setup()
    expect(runner.kill()).toEqual({ kind: "not-running" })
  })

  it("cleans up a stale pid file whose process is dead", () => {
    const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
    const { fs, runner } = setup({ [paths.pidFile]: "123" })

    const result = runner.kill()

    expect(result).toEqual({ kind: "not-running" })
    expect(fs.existsSync(paths.pidFile)).toBe(false)
  })

  it("kills a running process and removes the pid file", async () => {
    const { fs, process, paths, runner } = setup()
    process.onIsAlive(() => true)
    await runner.start()

    const result = runner.kill()

    expect(result).toEqual({ kind: "killed", pid: expect.any(Number) })
    expect(fs.existsSync(paths.pidFile)).toBe(false)
    expect(process.killed.length).toBeGreaterThan(0)
  })
})

describe("MinionAppRunner.status", () => {
  it("reports both app and gateway as stopped by default", () => {
    const { runner } = setup()
    expect(runner.status()).toEqual({
      app: { running: false, pid: null },
      gateway: { running: false, pid: null },
    })
  })

  it("reports both as running once started", async () => {
    const { process, runner } = setup()
    process.onIsAlive(() => true)

    await runner.start()

    const status = runner.status()
    expect(status.app).toEqual({ running: true, pid: expect.any(Number) })
    expect(status.gateway).toEqual({ running: true, pid: expect.any(Number) })
  })
})
