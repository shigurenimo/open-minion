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

  it("collects stats and evaluates the collection through the facade", () => {
    const minion = Minion.inMemory()

    const stats = minion.stats.collect()
    const evaluation = minion.collection.evaluate(stats)

    // Baseline sandbox stats always resolve to a common time-of-day species.
    expect(evaluation.species.rarity).toBe("common")
    expect(
      minion.collection.dex().species.some((s) => s.id === evaluation.species.id && s.discovered),
    ).toBe(true)
  })

  it("accepts a fully custom species/achievement catalog, with asset references, at construction", () => {
    const minion = Minion.inMemory({
      species: [
        {
          id: "custom",
          name: "オリジナルミニオン",
          rarity: "common",
          description: "常に出現するオリジナル種族。",
          condition: () => true,
          asset: "sprites/custom.png",
        },
      ],
      achievements: [
        {
          id: "custom-achievement",
          name: "オリジナル実績",
          description: "セッションを1つ実行した。",
          condition: (s) => s.totalSessionsSeen >= 1,
        },
      ],
    })

    const evaluation = minion.collection.evaluate(minion.stats.collect())

    expect(evaluation.species.id).toBe("custom")
    expect(evaluation.species.asset).toBe("sprites/custom.png")
    expect(minion.collection.dex().achievements.map((a) => a.id)).toEqual(["custom-achievement"])
  })
})
