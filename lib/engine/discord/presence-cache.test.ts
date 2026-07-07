import { describe, expect, it } from "vitest"
import { DiscordPresenceCache } from "@lib/engine/discord/presence-cache"

const GUILD_ID = "g1"

function guildCreate(
  overrides: Partial<Parameters<DiscordPresenceCache["applyGuildCreate"]>[0]> = {},
) {
  return {
    id: GUILD_ID,
    members: [
      { user: { id: "u1", username: "alice", global_name: "Alice" } },
      { user: { id: "u2", username: "bob", global_name: null }, nick: "ボブ" },
      { user: { id: "u3", username: "botto", bot: true } },
    ],
    presences: [{ user: { id: "u1" }, status: "online", activities: [] }],
    ...overrides,
  }
}

describe("DiscordPresenceCache", () => {
  it("builds membership from GUILD_CREATE, excluding bots and defaulting to offline", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })

    cache.applyGuildCreate(guildCreate())

    expect(cache.read()).toEqual(
      new Map([
        ["u1", { online: true, gaming: false, name: "Alice" }],
        ["u2", { online: false, gaming: false, name: "ボブ" }],
      ]),
    )
  })

  it("ignores a GUILD_CREATE for a different guild", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })

    cache.applyGuildCreate(guildCreate({ id: "other" }))

    expect(cache.read().size).toBe(0)
  })

  it("prefers nick over global_name over username for the display name", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })

    cache.applyGuildCreate({
      id: GUILD_ID,
      members: [
        { user: { id: "a", username: "user-a", global_name: "Global A" }, nick: "Nick A" },
        { user: { id: "b", username: "user-b", global_name: "Global B" } },
        { user: { id: "c", username: "user-c", global_name: null } },
      ],
      presences: [],
    })

    expect(cache.read().get("a")?.name).toBe("Nick A")
    expect(cache.read().get("b")?.name).toBe("Global B")
    expect(cache.read().get("c")?.name).toBe("user-c")
  })

  it("applies PRESENCE_UPDATE status flips for known members", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })
    cache.applyGuildCreate(guildCreate())

    cache.applyPresenceUpdate({
      guild_id: GUILD_ID,
      user: { id: "u2" },
      status: "idle",
      activities: [],
    })
    expect(cache.read().get("u2")?.online).toBe(true)

    cache.applyPresenceUpdate({
      guild_id: GUILD_ID,
      user: { id: "u2" },
      status: "offline",
      activities: [],
    })
    expect(cache.read().get("u2")?.online).toBe(false)
  })

  it("marks gaming while a Playing activity (type 0) is present", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })
    cache.applyGuildCreate(guildCreate())

    cache.applyPresenceUpdate({
      guild_id: GUILD_ID,
      user: { id: "u1" },
      status: "online",
      activities: [
        { type: 4, name: "Custom Status" },
        { type: 0, name: "Minecraft" },
      ],
    })
    expect(cache.read().get("u1")).toEqual({ online: true, gaming: true, name: "Alice" })

    // 聴いてるだけ (type 2) は gaming ではない
    cache.applyPresenceUpdate({
      guild_id: GUILD_ID,
      user: { id: "u1" },
      status: "online",
      activities: [{ type: 2, name: "Spotify" }],
    })
    expect(cache.read().get("u1")?.gaming).toBe(false)
  })

  it("ignores presence updates for unknown users and other guilds", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })
    cache.applyGuildCreate(guildCreate())

    cache.applyPresenceUpdate({
      guild_id: GUILD_ID,
      user: { id: "stranger" },
      status: "online",
      activities: [],
    })
    cache.applyPresenceUpdate({
      guild_id: "other",
      user: { id: "u2" },
      status: "online",
      activities: [],
    })

    expect(cache.read().has("stranger")).toBe(false)
    expect(cache.read().get("u2")?.online).toBe(false)
  })

  it("tracks members joining and leaving the guild", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID })
    cache.applyGuildCreate(guildCreate())

    cache.applyGuildMemberAdd({
      guild_id: GUILD_ID,
      user: { id: "u4", username: "dave", global_name: null },
    })
    expect(cache.read().get("u4")).toEqual({ online: false, gaming: false, name: "dave" })

    cache.applyGuildMemberRemove({ guild_id: GUILD_ID, user: { id: "u4" } })
    expect(cache.read().has("u4")).toBe(false)
  })

  it("only tracks allowed users when allowedUserIds is set", () => {
    const cache = new DiscordPresenceCache({ guildId: GUILD_ID, allowedUserIds: ["u2"] })

    cache.applyGuildCreate(guildCreate())
    cache.applyGuildMemberAdd({
      guild_id: GUILD_ID,
      user: { id: "u5", username: "eve", global_name: null },
    })

    expect(Array.from(cache.read().keys())).toEqual(["u2"])
  })
})
