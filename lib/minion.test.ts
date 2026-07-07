import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { MemoryMinionClock } from "@lib/engine/time/memory-clock"
import { ClaudeSessionsPetSource, PetSource } from "@lib/engine/gateway/pet-source"
import type { SessionInfo } from "@lib/engine/gateway/sessions"
import { Minion } from "@lib/minion"

function must<T>(value: T | Error): T {
  if (value instanceof Error) throw value
  return value
}

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
    expect(minion.config.get("missing")).toBeUndefined()
    expect(minion.config.list()).toEqual({ greeting: "hello" })
  })

  it("keeps config under the XDG config dir, separate from runtime state", () => {
    const minion = Minion.inMemory()
    expect(minion.paths.configFile).toBe("/sandbox/.config/minion/config.json")
    minion.config.set("greeting", "hello")
    expect(minion.paths.configDir).not.toBe(minion.paths.dataDir)
  })

  it("migrates a legacy <dataDir>/config.json to the config dir on construction", () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/.minion/config.json": `{"greeting":"hello"}` },
    })

    const minion = Minion.inMemory({ fs })

    expect(minion.config.get("greeting")).toBe("hello")
    expect(fs.existsSync("/sandbox/.config/minion/config.json")).toBe(true)
  })

  it("runs the start/status/kill lifecycle without touching real disk or processes", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const process = new MemoryMinionProcessRunner()
    const minion = Minion.inMemory({ fs, process })

    const startResult = await minion.app.start()
    expect(startResult).toEqual({ kind: "started", pid: expect.any(Number) })

    process.onIsAlive(() => true)
    const status = minion.app.status()
    expect(status.app).toEqual({ running: true, pid: expect.any(Number) })
    expect(status.gateway).toEqual({ running: true, pid: expect.any(Number) })

    const killResult = minion.app.kill()
    expect(killResult).toEqual({ kind: "killed", pid: expect.any(Number) })
  })

  it("builds a gateway server whose routes reflect the facade's own dependencies", async () => {
    const minion = Minion.inMemory()

    const res = await minion.gatewayServer().routes.request("/sessions")

    expect(await res.json()).toEqual({ sessions: [] })
  })

  it("collects stats and evaluates the collection through the facade", () => {
    // Pinned clock: the sandbox default (epoch 0) lands on 1969-12-31 in
    // negative-offset timezones, which resolves the rare month-end species
    // instead of a time-of-day common.
    const minion = Minion.inMemory({
      clock: new MemoryMinionClock({ start: new Date(2026, 6, 6, 13, 0) }),
    })

    const stats = must(minion.stats.collect())
    const evaluation = must(minion.collection.evaluate(stats))

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

    const evaluation = must(minion.collection.evaluate(must(minion.stats.collect())))

    expect(evaluation.species.id).toBe("custom")
    expect(evaluation.species.asset).toBe("sprites/custom.png")
    expect(minion.collection.dex().achievements.map((a) => a.id)).toEqual(["custom-achievement"])
  })
})

describe("Minion.gatewayServer source assembly", () => {
  class EmptyPetSource extends PetSource {
    read(): Map<string, SessionInfo> {
      return new Map()
    }
  }

  function sourceKinds(minion: Minion): string[] {
    return minion.gatewayServer().sources.map((source) => source.constructor.name)
  }

  it("serves Claude Code sessions by default", () => {
    expect(sourceKinds(Minion.inMemory())).toEqual(["ClaudeSessionsPetSource"])
  })

  it("drops the Claude source when claude.enabled=false", () => {
    const minion = Minion.inMemory()
    minion.config.set("claude.enabled", "false")
    expect(sourceKinds(minion)).toEqual([])
  })

  it("adds the Discord source once discord.token + discord.guildId are set", () => {
    const minion = Minion.inMemory()
    minion.config.set("discord.token", "t")
    minion.config.set("discord.guildId", "g")
    expect(sourceKinds(minion)).toEqual(["ClaudeSessionsPetSource", "DiscordPetSource"])
  })

  it("drops the Discord source when discord.enabled=false, even if configured", () => {
    const minion = Minion.inMemory()
    minion.config.set("discord.token", "t")
    minion.config.set("discord.guildId", "g")
    minion.config.set("discord.enabled", "false")
    expect(sourceKinds(minion)).toEqual(["ClaudeSessionsPetSource"])
  })

  it("appends custom petSources after the built-ins", () => {
    const custom = new EmptyPetSource()
    const minion = Minion.inMemory({ petSources: [custom] })
    const sources = minion.gatewayServer().sources
    expect(sources[0]).toBeInstanceOf(ClaudeSessionsPetSource)
    expect(sources[1]).toBe(custom)
  })

  it("can run entirely on custom sources with every built-in disabled", () => {
    const custom = new EmptyPetSource()
    const minion = Minion.inMemory({ petSources: [custom] })
    minion.config.set("claude.enabled", "false")
    minion.config.set("discord.token", "t")
    minion.config.set("discord.guildId", "g")
    minion.config.set("discord.enabled", "false")
    expect(minion.gatewayServer().sources).toEqual([custom])
  })
})
