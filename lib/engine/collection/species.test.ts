import { describe, expect, it } from "vitest"
import { DEFAULT_MINION_SPECIES, resolveSpecies } from "@lib/engine/collection/species"
import { timeBucketForHour } from "@lib/engine/stats/stats-snapshot"
import type { StatsSnapshot } from "@lib/engine/stats/stats-snapshot"

function stats(overrides: Partial<StatsSnapshot> = {}): StatsSnapshot {
  const hour = overrides.hour ?? 12
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

describe("DEFAULT_MINION_SPECIES catalog", () => {
  it("has a unique id per species", () => {
    const ids = DEFAULT_MINION_SPECIES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("resolveSpecies", () => {
  it("always resolves to a common time-of-day species at baseline stats, for every hour", () => {
    for (let hour = 0; hour < 24; hour++) {
      const species = resolveSpecies(stats({ hour }))
      expect(species.rarity).toBe("common")
    }
  })

  it("picks the day/morning/evening/night/late-night common matching the hour", () => {
    expect(resolveSpecies(stats({ hour: 2 })).id).toBe("late-night")
    expect(resolveSpecies(stats({ hour: 7 })).id).toBe("morning")
    expect(resolveSpecies(stats({ hour: 13 })).id).toBe("day")
    expect(resolveSpecies(stats({ hour: 18 })).id).toBe("evening")
    expect(resolveSpecies(stats({ hour: 22 })).id).toBe("night")
  })

  it("prefers the rare swarm species over the time-of-day common when 5+ sessions run concurrently", () => {
    const species = resolveSpecies(stats({ hour: 13, currentConcurrentSessions: 5 }))
    expect(species.id).toBe("swarm")
    expect(species.rarity).toBe("rare")
  })

  it("prefers overdrive over the common at 3-4 concurrent sessions", () => {
    expect(resolveSpecies(stats({ currentConcurrentSessions: 3 })).id).toBe("overdrive")
    expect(resolveSpecies(stats({ currentConcurrentSessions: 4 })).id).toBe("overdrive")
  })

  it("prefers swarm over overdrive once concurrency reaches 5", () => {
    expect(resolveSpecies(stats({ currentConcurrentSessions: 5 })).id).toBe("swarm")
  })

  it("resolves insomniac only during late night with an active session", () => {
    expect(resolveSpecies(stats({ hour: 2, currentConcurrentSessions: 1 })).id).toBe("insomniac")
    expect(resolveSpecies(stats({ hour: 2, currentConcurrentSessions: 0 })).id).toBe("late-night")
  })

  it("prefers swarm over insomniac when both conditions hold", () => {
    expect(resolveSpecies(stats({ hour: 2, currentConcurrentSessions: 5 })).id).toBe("swarm")
  })

  it("resolves veteran once lifetime sessions cross 100", () => {
    expect(resolveSpecies(stats({ totalSessionsSeen: 100 })).id).toBe("veteran")
    expect(resolveSpecies(stats({ totalSessionsSeen: 99 })).id).not.toBe("veteran")
  })

  it("resolves token-based rares from tokensToday and tokensTotal", () => {
    expect(resolveSpecies(stats({ tokensToday: 1_000_000 })).id).toBe("big-spender")
    expect(resolveSpecies(stats({ tokensTotal: 10_000_000 })).id).toBe("golden")
  })
})
