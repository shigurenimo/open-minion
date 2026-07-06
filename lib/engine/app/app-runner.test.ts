import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { resolveMinionPaths } from "@lib/engine/app/app-paths"
import { MinionAppRunner } from "@lib/engine/app/app-runner"

function setup(files: Record<string, string> = {}) {
  const fs = new MemoryMinionFileSystem({
    files: { "/pkg/swift/Package.swift": "// package", ...files },
  })
  const process = new MemoryMinionProcessRunner()
  const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
  const runner = new MinionAppRunner({
    fs,
    process,
    paths,
    gatewayCommand: ["bun", "/pkg/gateway.ts"],
  })
  return { fs, process, paths, runner }
}

describe("MinionAppRunner.start", () => {
  it("builds and spawns on first release start, and spawns the gateway", async () => {
    const { fs, process, paths, runner } = setup()

    const message = await runner.start(false)

    expect(message).toMatch(/^起動した \(pid \d+\)$/)
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

    const first = await runner.start(false)
    expect(first).toMatch(/^起動した/)

    const second = await runner.start(false)
    expect(second).toMatch(/^すでに起動中 \(pid \d+\)$/)
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

    const message = await runner.start(false)

    expect(message).toBe("他の起動処理と競合したため中止")
  })

  it("reports build failure and clears the lock", async () => {
    const { fs, process, paths, runner } = setup()
    process.onRunInherit(() => 1)

    const message = await runner.start(false)

    expect(message).toBe("ビルド失敗")
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
    await runner.start(false)
    process.calls.length = 0
    fs.rmSync(paths.pidFile, { force: true })
    fs.rmSync(paths.gatewayPidFile, { force: true })

    await runner.start(false)

    expect(process.calls.some((c) => c.kind === "runInherit")).toBe(false)
  })

  it("always rebuilds in debug mode regardless of the source hash", async () => {
    const { process, runner } = setup()

    await runner.start(true)
    process.calls.length = 0
    runner.kill()

    await runner.start(true)

    expect(process.calls.some((c) => c.kind === "runInherit")).toBe(true)
  })

  it("does not spawn a second gateway when one is already alive", async () => {
    const { process, runner } = setup()

    await runner.start(false) // app pid 1001, gateway pid 1002 (default incrementing stub)
    process.onIsAlive((pid) => pid === 1002) // gateway still alive, app pid considered dead
    const gatewaySpawnsBefore = process.calls.filter(
      (c) => c.kind === "spawnDetached" && c.command[0] === "bun",
    ).length

    await runner.start(false)

    const gatewaySpawnsAfter = process.calls.filter(
      (c) => c.kind === "spawnDetached" && c.command[0] === "bun",
    ).length
    expect(gatewaySpawnsAfter).toBe(gatewaySpawnsBefore)
  })
})

describe("MinionAppRunner.kill", () => {
  it("reports not running when there is no pid file", () => {
    const { runner } = setup()
    expect(runner.kill()).toBe("起動していない")
  })

  it("cleans up a stale pid file whose process is dead", () => {
    const paths = resolveMinionPaths({ packageRoot: "/pkg", dataDir: "/data" })
    const { fs, runner } = setup({ [paths.pidFile]: "123" })

    const message = runner.kill()

    expect(message).toBe("起動していない")
    expect(fs.existsSync(paths.pidFile)).toBe(false)
  })

  it("kills a running process and removes the pid file", async () => {
    const { fs, process, paths, runner } = setup()
    process.onIsAlive(() => true)
    await runner.start(false)

    const message = runner.kill()

    expect(message).toMatch(/^停止した \(pid \d+\)$/)
    expect(fs.existsSync(paths.pidFile)).toBe(false)
    expect(process.killed.length).toBeGreaterThan(0)
  })
})

describe("MinionAppRunner.status", () => {
  it("reports both app and gateway as stopped by default", () => {
    const { runner } = setup()
    expect(runner.status()).toBe("停止中\ngateway停止中")
  })

  it("reports both as running once started", async () => {
    const { process, runner } = setup()
    process.onIsAlive(() => true)

    await runner.start(false)

    expect(runner.status()).toMatch(/^起動中 \(pid \d+\)\ngateway起動中 \(pid \d+\)$/)
  })
})
