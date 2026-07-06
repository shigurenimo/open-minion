import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { Minion } from "@lib/minion"

describe("Minion.inMemory", () => {
  it("roots state under the sandbox data dir, not the real home directory", () => {
    const minion = Minion.inMemory()
    expect(minion.paths.dataDir).toBe("/sandbox/.minion")
    expect(minion.paths.pidFile).toBe("/sandbox/.minion/pid")
  })

  it("round-trips config through the facade", () => {
    const minion = Minion.inMemory()
    minion.config.set("greeting", "hello")
    expect(minion.config.get("greeting")).toBe("hello")
    expect(minion.config.list()).toEqual({ greeting: "hello" })
  })

  it("runs the start/status/kill lifecycle without touching real disk or processes", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const process = new MemoryMinionProcessRunner()
    const minion = Minion.inMemory({ fs, process })

    const startMessage = await minion.app.start(false)
    expect(startMessage).toMatch(/^起動した \(pid \d+\)$/)

    process.onIsAlive(() => true)
    expect(minion.app.status()).toMatch(/^起動中 \(pid \d+\)\ngateway起動中 \(pid \d+\)$/)

    const killMessage = minion.app.kill()
    expect(killMessage).toMatch(/^停止した \(pid \d+\)$/)
  })

  it("builds a gateway server whose routes reflect the facade's own dependencies", async () => {
    const minion = Minion.inMemory()

    const res = await minion.gatewayServer().routes.request("/sessions")

    expect(await res.json()).toEqual({ sessions: [] })
  })
})
