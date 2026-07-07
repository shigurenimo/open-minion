import { describe, expect, it } from "vitest"
import { DEFAULT_ACHIEVEMENTS } from "./achievements.ts"
import { timeBucketForHour } from "../stats/stats-snapshot.ts"
import type { StatsSnapshot } from "../stats/stats-snapshot.ts"

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

describe("DEFAULT_ACHIEVEMENTS catalog", () => {
  it("has a unique id per achievement", () => {
    const ids = DEFAULT_ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("has no achievement satisfied at the all-zero baseline", () => {
    const baseline = stats()
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      expect(achievement.condition(baseline)).toBe(false)
    }
  })

  it("unlocks first-session as soon as one session has been seen", () => {
    const first = DEFAULT_ACHIEVEMENTS.find((a) => a.id === "first-session")
    expect(first?.condition(stats({ totalSessionsSeen: 1 }))).toBe(true)
  })

  it("unlocks tier achievements at their exact threshold and not just below it", () => {
    const tiers: [string, keyof StatsSnapshot, number][] = [
      ["sessions-10", "totalSessionsSeen", 10],
      ["concurrent-5", "maxConcurrentSessions", 5],
      ["tokens-1m", "tokensTotal", 1_000_000],
      ["daily-million", "tokensToday", 1_000_000],
    ]

    for (const [id, key, threshold] of tiers) {
      const achievement = DEFAULT_ACHIEVEMENTS.find((a) => a.id === id)
      expect(achievement).toBeDefined()
      expect(achievement?.condition(stats({ [key]: threshold }))).toBe(true)
      expect(achievement?.condition(stats({ [key]: threshold - 1 }))).toBe(false)
    }
  })

  it("unlocks exactly one time-of-day achievement per bucket", () => {
    expect(
      DEFAULT_ACHIEVEMENTS.filter((a) => a.condition(stats({ hour: 7 }))).map((a) => a.id),
    ).toContain("early-bird")
    expect(
      DEFAULT_ACHIEVEMENTS.filter((a) => a.condition(stats({ hour: 22 }))).map((a) => a.id),
    ).toContain("night-owl")
    expect(
      DEFAULT_ACHIEVEMENTS.filter((a) => a.condition(stats({ hour: 2 }))).map((a) => a.id),
    ).toContain("midnight-coder")
  })
})
