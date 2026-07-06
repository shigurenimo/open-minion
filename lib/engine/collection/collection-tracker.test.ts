import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MinionCollectionStore } from "@lib/engine/collection/collection-store"
import { MinionCollectionTracker } from "@lib/engine/collection/collection-tracker"
import { timeBucketForHour } from "@lib/engine/stats/stats-snapshot"
import type { StatsSnapshot } from "@lib/engine/stats/stats-snapshot"

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
    const result = tracker().evaluate(stats())

    expect(result.species.id).toBe("day")
    expect(result.newlyDiscoveredSpecies?.id).toBe("day")
    expect(result.newlyUnlockedAchievements).toEqual([])
  })

  it("does not re-discover or re-unlock on a second identical evaluation", () => {
    const t = tracker()
    t.evaluate(stats())

    const second = t.evaluate(stats())

    expect(second.newlyDiscoveredSpecies).toBeNull()
    expect(second.newlyUnlockedAchievements).toEqual([])
  })

  it("unlocks first-session once totalSessionsSeen reaches 1, only on the crossing evaluation", () => {
    const t = tracker()
    t.evaluate(stats({ totalSessionsSeen: 0 }))

    const crossing = t.evaluate(stats({ totalSessionsSeen: 1 }))
    expect(crossing.newlyUnlockedAchievements.map((a) => a.id)).toContain("first-session")

    const after = t.evaluate(stats({ totalSessionsSeen: 1 }))
    expect(after.newlyUnlockedAchievements).toEqual([])
  })

  it("discovers a new rare species when conditions change without re-discovering the old one", () => {
    const t = tracker()
    t.evaluate(stats({ currentConcurrentSessions: 0 })) // discovers "day"

    const swarm = t.evaluate(stats({ currentConcurrentSessions: 5 }))
    expect(swarm.newlyDiscoveredSpecies?.id).toBe("swarm")

    const again = t.evaluate(stats({ currentConcurrentSessions: 0 })) // back to "day", already discovered
    expect(again.newlyDiscoveredSpecies).toBeNull()
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

    const dayCommon = dex.species.find((s) => s.id === "day")
    expect(dayCommon?.discovered).toBe(false)
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

    const result = t.evaluate(stats({ totalSessionsSeen: 1 }))

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
