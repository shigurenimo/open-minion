import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@/lib/engine/fs/memory-file-system.ts"
import { MinionCollectionStore } from "@/lib/engine/collection/collection-store.ts"
import { MinionCollectionTracker } from "@/lib/engine/collection/collection-tracker.ts"
import { timeBucketForHour } from "@/lib/engine/stats/stats-snapshot.ts"
import type { StatsSnapshot } from "@/lib/engine/stats/stats-snapshot.ts"

function must<T>(value: T | Error): T {
  if (value instanceof Error) throw value
  return value
}

function stats(overrides: Partial<StatsSnapshot> = {}): StatsSnapshot {
  const hour = overrides.hour ?? 13
  return {
    now: new Date(2026, 6, 6, hour, 0, 0),
    hour,
    timeBucket: timeBucketForHour(hour),
    currentConcurrentSessions: 0,
    maxConcurrentSessions: 0,
    totalSessionsSeen: 0,
    uniqueProjectsSeen: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    tokensTotal: 0,
    tokensToday: 0,
    tokensThisWeek: 0,
    ...overrides,
  }
}

function tracker(): MinionCollectionTracker {
  const store = new MinionCollectionStore({
    fs: new MemoryMinionFileSystem(),
    path: "/data/collection.json",
  })
  return new MinionCollectionTracker({ store })
}

describe("MinionCollectionTracker.evaluate", () => {
  it("discovers the resolved species and unlocks no achievement at the all-zero baseline", () => {
    const result = must(tracker().evaluate(stats()))

    expect(result.species.id).toBe("day")
    expect(result.newlyDiscoveredSpecies.map((s) => s.id)).toEqual(["day"])
    expect(result.newlyUnlockedAchievements).toEqual([])
  })

  it("does not re-discover or re-unlock on a second identical evaluation", () => {
    const t = tracker()
    t.evaluate(stats())

    const second = must(t.evaluate(stats()))

    expect(second.newlyDiscoveredSpecies).toEqual([])
    expect(second.newlyUnlockedAchievements).toEqual([])
  })

  it("unlocks first-session once totalSessionsSeen reaches 1, only on the crossing evaluation", () => {
    const t = tracker()
    t.evaluate(stats({ totalSessionsSeen: 0 }))

    const crossing = must(t.evaluate(stats({ totalSessionsSeen: 1 })))
    expect(crossing.newlyUnlockedAchievements.map((a) => a.id)).toContain("first-session")

    const after = must(t.evaluate(stats({ totalSessionsSeen: 1 })))
    expect(after.newlyUnlockedAchievements).toEqual([])
  })

  it("discovers new species when conditions change without re-discovering old ones", () => {
    const t = tracker()
    t.evaluate(stats({ currentConcurrentSessions: 0 })) // discovers "day"

    const swarm = must(t.evaluate(stats({ currentConcurrentSessions: 5 })))
    expect(swarm.species.id).toBe("swarm")
    // Everything matching at 5 concurrent sessions is discovered at once, not just the manifesting one.
    expect(swarm.newlyDiscoveredSpecies.map((s) => s.id)).toEqual(["swarm", "overdrive", "twins"])

    const again = must(t.evaluate(stats({ currentConcurrentSessions: 0 }))) // back to "day", already discovered
    expect(again.newlyDiscoveredSpecies).toEqual([])
  })

  it("discovers species masked by a permanently-true higher-priority rare, keeping the dex completable", () => {
    const t = tracker()

    // A lifetime-token rare outranks the time-of-day commons — the common
    // must still be discoverable underneath it.
    const result = must(t.evaluate(stats({ tokensTotal: 100_000_000 })))

    expect(result.species.id).toBe("legend")
    expect(result.newlyDiscoveredSpecies.map((s) => s.id)).toContain("day")
  })
})

describe("MinionCollectionTracker.dex", () => {
  it("shows every catalog entry locked/undiscovered before any evaluation", () => {
    const dex = tracker().dex()

    expect(dex.achievements.every((a) => !a.unlocked)).toBe(true)
    expect(dex.species.every((s) => !s.discovered)).toBe(true)
  })

  it("reflects unlocked achievements and discovered species after evaluation", () => {
    const t = tracker()
    t.evaluate(stats({ totalSessionsSeen: 1, currentConcurrentSessions: 5 }))

    const dex = t.dex()

    const firstSession = dex.achievements.find((a) => a.id === "first-session")
    expect(firstSession?.unlocked).toBe(true)
    expect(firstSession?.unlockedAt).not.toBeNull()

    const swarm = dex.species.find((s) => s.id === "swarm")
    expect(swarm?.discovered).toBe(true)
    expect(swarm?.firstSeenAt).not.toBeNull()

    // The time-of-day common also matched during that evaluation, so it's
    // discovered too even though the rare outranked it as "current".
    const dayCommon = dex.species.find((s) => s.id === "day")
    expect(dayCommon?.discovered).toBe(true)
  })
})

describe("MinionCollectionTracker with a custom catalog", () => {
  it("evaluates and renders a fully custom species/achievement catalog instead of the defaults", () => {
    const store = new MinionCollectionStore({
      fs: new MemoryMinionFileSystem(),
      path: "/data/collection.json",
    })
    const t = new MinionCollectionTracker({
      store,
      species: [
        {
          id: "custom-only",
          name: "カスタムミニオン",
          rarity: "common",
          description: "常に出現するテスト用の種族。",
          condition: () => true,
          asset: "sprites/custom.png",
        },
      ],
      achievements: [
        {
          id: "custom-achievement",
          name: "カスタム実績",
          description: "テスト用の実績。",
          condition: (s) => s.totalSessionsSeen >= 1,
        },
      ],
    })

    const result = must(t.evaluate(stats({ totalSessionsSeen: 1 })))

    expect(result.species.id).toBe("custom-only")
    expect(result.newlyUnlockedAchievements.map((a) => a.id)).toEqual(["custom-achievement"])

    const dex = t.dex()
    expect(dex.species).toEqual([
      {
        id: "custom-only",
        name: "カスタムミニオン",
        rarity: "common",
        description: "常に出現するテスト用の種族。",
        condition: expect.any(Function),
        asset: "sprites/custom.png",
        discovered: true,
        firstSeenAt: expect.any(String),
      },
    ])
    expect(dex.achievements.map((a) => a.id)).toEqual(["custom-achievement"])
  })
})
