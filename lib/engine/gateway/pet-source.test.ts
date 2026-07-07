import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "../fs/memory-file-system"
import { MemoryMinionProcessRunner } from "../process/memory-process-runner"
import { MemoryMinionClock } from "../time/memory-clock"
import { MemoryMinionRandomSource } from "../random/memory-random-source"
import { DiscordGatewayClient } from "../discord/discord-gateway-client"
import { DiscordPetSource } from "../discord/discord-pet-source"
import { MemoryMinionWebSocketFactory } from "../discord/memory-websocket-factory"
import { ClaudeSessionsPetSource, PetSource, mergePetSources } from "./pet-source"
import type { SessionInfo } from "./sessions"

class FixedPetSource extends PetSource {
  private readonly entries: Map<string, SessionInfo>

  constructor(entries: Record<string, SessionInfo>) {
    super()
    this.entries = new Map(Object.entries(entries))
  }

  read(): Map<string, SessionInfo> {
    return this.entries
  }
}

describe("mergePetSources", () => {
  it("merges entries from every source", () => {
    const merged = mergePetSources([
      new FixedPetSource({ a: { running: true, name: "repo" } }),
      new FixedPetSource({ "discord:u1": { running: false, name: "Alice" } }),
    ])

    expect(merged).toEqual(
      new Map([
        ["a", { running: true, name: "repo" }],
        ["discord:u1", { running: false, name: "Alice" }],
      ]),
    )
  })

  it("returns an empty map with no sources", () => {
    expect(mergePetSources([]).size).toBe(0)
  })
})

describe("ClaudeSessionsPetSource", () => {
  it("reads Claude Code session files, same as readActiveSessions", () => {
    const fs = new MemoryMinionFileSystem()
    const process = new MemoryMinionProcessRunner()
    fs.writeFileSync(
      "/home/.claude/sessions/a.json",
      JSON.stringify({ sessionId: "a", pid: 10, status: "busy", name: "repo" }),
    )
    process.setAlivePids([10])

    const source = new ClaudeSessionsPetSource({
      fs,
      process,
      clock: new MemoryMinionClock(),
      sessionsDir: "/home/.claude/sessions",
      projectsDir: "/home/.claude/projects",
    })

    expect(source.read().get("a")).toEqual({ running: true, name: "repo", cwd: undefined })
  })
})

describe("DiscordPetSource", () => {
  it("maps presences to namespaced SessionInfo entries", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = new DiscordGatewayClient({
      token: "t",
      guildId: "g1",
      webSockets: factory,
      random: new MemoryMinionRandomSource(),
    })
    const source = new DiscordPetSource({ client })

    source.start()
    const connection = factory.latest()
    expect(connection).toBeDefined()
    if (!connection) return

    connection.emitMessage({
      op: 0,
      s: 1,
      t: "GUILD_CREATE",
      d: {
        id: "g1",
        members: [
          { user: { id: "u1", username: "alice", global_name: null } },
          { user: { id: "u2", username: "bob", global_name: null } },
        ],
        presences: [
          {
            user: { id: "u1" },
            status: "online",
            activities: [{ type: 0, name: "Minecraft" }],
          },
        ],
      },
    })

    expect(source.read()).toEqual(
      new Map([["discord:u1", { running: true, name: "alice", activity: "gaming" }]]),
    )

    source.stop()
  })
})
