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

/** resolveSpecies against the default catalog, unwrapped — the defaults always resolve. */
function resolve(overrides: Partial<StatsSnapshot> = {}) {
  const species = resolveSpecies(stats(overrides))
  if (species instanceof Error) throw species
  return species
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
      expect(resolve({ hour }).rarity).toBe("common")
    }
  })

  it("picks the day/morning/evening/night/late-night common matching the hour", () => {
    expect(resolve({ hour: 2 }).id).toBe("late-night")
    expect(resolve({ hour: 7 }).id).toBe("morning")
    expect(resolve({ hour: 13 }).id).toBe("day")
    expect(resolve({ hour: 18 }).id).toBe("evening")
    expect(resolve({ hour: 22 }).id).toBe("night")
  })

  it("prefers the rare swarm species over the time-of-day common when 5+ sessions run concurrently", () => {
    const species = resolve({ hour: 13, currentConcurrentSessions: 5 })
    expect(species.id).toBe("swarm")
    expect(species.rarity).toBe("rare")
  })

  it("prefers overdrive over the common at 3-4 concurrent sessions", () => {
    expect(resolve({ currentConcurrentSessions: 3 }).id).toBe("overdrive")
    expect(resolve({ currentConcurrentSessions: 4 }).id).toBe("overdrive")
  })

  it("prefers swarm over overdrive once concurrency reaches 5", () => {
    expect(resolve({ currentConcurrentSessions: 5 }).id).toBe("swarm")
  })

  it("resolves insomniac only during late night with an active session", () => {
    expect(resolve({ hour: 2, currentConcurrentSessions: 1 }).id).toBe("insomniac")
    expect(resolve({ hour: 2, currentConcurrentSessions: 0 }).id).toBe("late-night")
  })

  it("prefers swarm over insomniac when both conditions hold", () => {
    expect(resolve({ hour: 2, currentConcurrentSessions: 5 }).id).toBe("swarm")
  })

  it("resolves veteran once lifetime sessions cross 100", () => {
    expect(resolve({ totalSessionsSeen: 100 }).id).toBe("veteran")
    expect(resolve({ totalSessionsSeen: 99 }).id).not.toBe("veteran")
  })

  it("resolves token-based rares from tokensToday and tokensTotal", () => {
    expect(resolve({ tokensToday: 1_000_000 }).id).toBe("big-spender")
    expect(resolve({ tokensTotal: 10_000_000 }).id).toBe("golden")
  })

  it("resolves zorome only at exactly 11:11 or 22:22", () => {
    expect(resolve({ hour: 11, now: new Date(2026, 6, 6, 11, 11) }).id).toBe("zorome")
    expect(resolve({ hour: 22, now: new Date(2026, 6, 6, 22, 22) }).id).toBe("zorome")
    expect(resolve({ hour: 11, now: new Date(2026, 6, 6, 11, 12) }).id).not.toBe("zorome")
  })

  it("resolves the full-moon species on a full-moon night, but not during the day", () => {
    // 2026-07-30 12:00 UTC is within the ±1-day full-moon window (and, unlike
    // the 2026-06-30 full moon, not also the last day of the month).
    const fullMoon = new Date("2026-07-30T12:00:00.000Z")
    expect(resolve({ hour: 22, now: fullMoon }).id).toBe("full-moon")
    expect(resolve({ hour: 13, now: fullMoon }).id).toBe("day")
  })

  it("resolves the new-moon species only in the late night of a new moon", () => {
    // 2026-07-15 12:00 UTC is within the ±1-day new-moon window.
    const newMoon = new Date("2026-07-15T12:00:00.000Z")
    expect(resolve({ hour: 2, now: newMoon }).id).toBe("new-moon")
    expect(resolve({ hour: 22, now: newMoon }).id).toBe("night")
  })

  it("scales the concurrency ladder: twins, overdrive, swarm, mega-swarm", () => {
    // hour 13: the fixture default of 12 would resolve lunch-break ahead of twins.
    expect(resolve({ hour: 13, currentConcurrentSessions: 2 }).id).toBe("twins")
    expect(resolve({ currentConcurrentSessions: 3 }).id).toBe("overdrive")
    expect(resolve({ currentConcurrentSessions: 9 }).id).toBe("swarm")
    expect(resolve({ currentConcurrentSessions: 10 }).id).toBe("mega-swarm")
  })

  it("resolves lunch-break in the 12 o'clock hour with an active session, above twins", () => {
    expect(resolve({ hour: 12, currentConcurrentSessions: 1 }).id).toBe("lunch-break")
    expect(resolve({ hour: 12, currentConcurrentSessions: 2 }).id).toBe("lunch-break")
    expect(resolve({ hour: 12, currentConcurrentSessions: 0 }).id).toBe("day")
  })

  it("scales the token ladder: glutton, big-spender daily; golden, legend lifetime", () => {
    expect(resolve({ tokensToday: 300_000 }).id).toBe("glutton")
    expect(resolve({ tokensToday: 1_000_000 }).id).toBe("big-spender")
    expect(resolve({ tokensTotal: 10_000_000 }).id).toBe("golden")
    expect(resolve({ tokensTotal: 100_000_000 }).id).toBe("legend")
  })

  it("scales the streak ladder: three-day, marathon, perfect-attendance", () => {
    expect(resolve({ currentStreakDays: 3 }).id).toBe("three-day-streak")
    expect(resolve({ currentStreakDays: 7 }).id).toBe("marathon")
    expect(resolve({ currentStreakDays: 30 }).id).toBe("perfect-attendance")
  })

  it("scales the project ladder: juggler then wanderer", () => {
    expect(resolve({ uniqueProjectsSeen: 3 }).id).toBe("juggler")
    expect(resolve({ uniqueProjectsSeen: 10 }).id).toBe("wanderer")
  })

  it("resolves rookie at 10 lifetime sessions and veteran at 100", () => {
    expect(resolve({ totalSessionsSeen: 10 }).id).toBe("rookie")
    expect(resolve({ totalSessionsSeen: 100 }).id).toBe("veteran")
  })

  it("resolves morning-active only in the morning with an active session", () => {
    expect(resolve({ hour: 7, currentConcurrentSessions: 1 }).id).toBe("morning-active")
    expect(resolve({ hour: 7, currentConcurrentSessions: 0 }).id).toBe("morning")
  })

  it("prefers perfect-attendance over marathon once the streak reaches 30 days", () => {
    expect(resolve({ currentStreakDays: 7 }).id).toBe("marathon")
    expect(resolve({ currentStreakDays: 30 }).id).toBe("perfect-attendance")
  })

  it("resolves the month-end species on the last day of the month", () => {
    expect(resolve({ hour: 13, now: new Date(2026, 6, 31, 13, 0) }).id).toBe("month-end")
    expect(resolve({ hour: 13, now: new Date(2026, 1, 28, 13, 0) }).id).toBe("month-end") // 2026-02-28
  })

  it("resolves friday-night only on Friday nights with an active session", () => {
    const fridayNight = new Date(2026, 6, 10, 22, 0) // 2026-07-10 is a Friday
    expect(resolve({ hour: 22, now: fridayNight, currentConcurrentSessions: 1 }).id).toBe(
      "friday-night",
    )
    expect(resolve({ hour: 22, now: fridayNight, currentConcurrentSessions: 0 }).id).toBe("night")
  })

  it("resolves sunday-worker on a Sunday with an active session", () => {
    const sunday = new Date(2026, 6, 12, 13, 0) // 2026-07-12 is a Sunday
    expect(resolve({ hour: 13, now: sunday, currentConcurrentSessions: 1 }).id).toBe(
      "sunday-worker",
    )
    expect(resolve({ hour: 13, now: sunday, currentConcurrentSessions: 0 }).id).toBe("day")
  })

  it("resolves devoted for a single-project regular, ahead of wanderer/veteran", () => {
    expect(resolve({ uniqueProjectsSeen: 1, totalSessionsSeen: 50 }).id).toBe("devoted")
    expect(resolve({ uniqueProjectsSeen: 1, totalSessionsSeen: 49 }).id).toBe("rookie") // 10+ sessions, not yet devoted
    expect(resolve({ uniqueProjectsSeen: 2, totalSessionsSeen: 100 }).id).toBe("veteran")
  })

  it("returns an Error (instead of throwing) when a custom catalog covers nothing", () => {
    const result = resolveSpecies(stats(), [
      {
        id: "never",
        name: "出ないミニオン",
        rarity: "common",
        description: "条件を満たさないテスト用の種族。",
        condition: () => false,
      },
    ])

    expect(result).toBeInstanceOf(Error)
  })
})
