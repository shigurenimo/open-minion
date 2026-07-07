import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "../fs/memory-file-system.ts"
import { MinionCollectionStore } from "./collection-store.ts"

function store(): MinionCollectionStore {
  return new MinionCollectionStore({
    fs: new MemoryMinionFileSystem(),
    path: "/data/collection.json",
  })
}

describe("MinionCollectionStore", () => {
  it("starts with nothing unlocked or discovered", () => {
    expect(store().read()).toEqual({ achievements: {}, species: {} })
  })

  it("unlocks an achievement and records the timestamp", () => {
    const s = store()
    const unlocked = s.unlockAchievement("first-session", new Date("2026-07-06T00:00:00.000Z"))
    expect(unlocked).toBe(true)
    expect(s.read().achievements["first-session"]).toBe("2026-07-06T00:00:00.000Z")
  })

  it("returns false and keeps the original timestamp on a repeat unlock", () => {
    const s = store()
    s.unlockAchievement("first-session", new Date("2026-07-06T00:00:00.000Z"))
    const again = s.unlockAchievement("first-session", new Date("2026-07-07T00:00:00.000Z"))
    expect(again).toBe(false)
    expect(s.read().achievements["first-session"]).toBe("2026-07-06T00:00:00.000Z")
  })

  it("discovers a species independently of achievements", () => {
    const s = store()
    const discovered = s.discoverSpecies("swarm", new Date("2026-07-06T00:00:00.000Z"))
    expect(discovered).toBe(true)
    expect(s.read().species.swarm).toBe("2026-07-06T00:00:00.000Z")
    expect(s.read().achievements).toEqual({})
  })

  it("persists across store instances sharing the same fs", () => {
    const fs = new MemoryMinionFileSystem()
    new MinionCollectionStore({ fs, path: "/data/collection.json" }).unlockAchievement(
      "first-session",
      new Date("2026-07-06T00:00:00.000Z"),
    )

    const reopened = new MinionCollectionStore({ fs, path: "/data/collection.json" })
    expect(reopened.read().achievements["first-session"]).toBe("2026-07-06T00:00:00.000Z")
  })
})
