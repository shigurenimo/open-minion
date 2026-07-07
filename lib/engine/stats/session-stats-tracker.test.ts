import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { SessionStatsTracker } from "@lib/engine/stats/session-stats-tracker"
import type { SessionInfo } from "@lib/engine/gateway/sessions"

function must<T>(value: T | Error): T {
  if (value instanceof Error) throw value
  return value
}

const DAY1 = new Date("2026-07-01T12:00:00.000Z")
const DAY2 = new Date("2026-07-02T12:00:00.000Z")
const DAY4 = new Date("2026-07-04T12:00:00.000Z")

function sessions(entries: Record<string, Partial<SessionInfo>>): Map<string, SessionInfo> {
  return new Map(
    Object.entries(entries).map(([id, info]) => [id, { running: true, name: id, ...info }]),
  )
}

function tracker(): SessionStatsTracker {
  return new SessionStatsTracker({
    fs: new MemoryMinionFileSystem(),
    path: "/data/session-stats.json",
  })
}

describe("SessionStatsTracker", () => {
  it("starts at zero", () => {
    expect(tracker().summary()).toEqual({
      totalSessionsSeen: 0,
      currentConcurrentSessions: 0,
      maxConcurrentSessions: 0,
      uniqueProjectsSeen: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
    })
  })

  it("counts each distinct session id once, lifetime", () => {
    const t = tracker()
    t.record(sessions({ a: {}, b: {} }), DAY1)
    const result = must(t.record(sessions({ a: {}, b: {}, c: {} }), DAY1))
    expect(result.totalSessionsSeen).toBe(3)
  })

  it("reports the current concurrent count from the latest record call", () => {
    const t = tracker()
    const result = must(t.record(sessions({ a: {}, b: {}, c: {} }), DAY1))
    expect(result.currentConcurrentSessions).toBe(3)
  })

  it("tracks the concurrency high-water-mark across calls", () => {
    const t = tracker()
    t.record(sessions({ a: {}, b: {}, c: {}, d: {}, e: {} }), DAY1)
    const result = must(t.record(sessions({ a: {} }), DAY1))
    expect(result.maxConcurrentSessions).toBe(5)
    expect(result.currentConcurrentSessions).toBe(1)
  })

  it("counts distinct project directories across sessions", () => {
    const t = tracker()
    t.record(sessions({ a: { cwd: "/repo-1" }, b: { cwd: "/repo-2" } }), DAY1)
    const result = must(t.record(sessions({ c: { cwd: "/repo-1" }, d: { cwd: "/repo-3" } }), DAY1))
    expect(result.uniqueProjectsSeen).toBe(3)
  })

  it("ignores sessions without a cwd when counting projects", () => {
    const t = tracker()
    const result = must(t.record(sessions({ a: {} }), DAY1))
    expect(result.uniqueProjectsSeen).toBe(0)
  })

  it("starts a 1-day streak on the first active day", () => {
    const result = must(tracker().record(sessions({ a: {} }), DAY1))
    expect(result.currentStreakDays).toBe(1)
    expect(result.longestStreakDays).toBe(1)
  })

  it("extends the streak on the very next calendar day", () => {
    const t = tracker()
    t.record(sessions({ a: {} }), DAY1)
    const result = must(t.record(sessions({ a: {} }), DAY2))
    expect(result.currentStreakDays).toBe(2)
    expect(result.longestStreakDays).toBe(2)
  })

  it("resets the streak after a missed day, but keeps the longest record", () => {
    const t = tracker()
    t.record(sessions({ a: {} }), DAY1)
    t.record(sessions({ a: {} }), DAY2)
    const result = must(t.record(sessions({ a: {} }), DAY4)) // skipped day 3

    expect(result.currentStreakDays).toBe(1)
    expect(result.longestStreakDays).toBe(2)
  })

  it("does not double-count multiple record() calls on the same day", () => {
    const t = tracker()
    t.record(sessions({ a: {} }), DAY1)
    const result = must(t.record(sessions({ a: {} }), DAY1))
    expect(result.currentStreakDays).toBe(1)
  })

  it("does not extend the streak on a day with no active sessions", () => {
    const t = tracker()
    t.record(sessions({ a: {} }), DAY1)
    const result = must(t.record(sessions({}), DAY2))
    expect(result.currentStreakDays).toBe(1)
  })

  it("backfills defaults when reading a file written by an older schema version", () => {
    const fs = new MemoryMinionFileSystem({
      files: {
        "/data/session-stats.json": JSON.stringify({
          totalSessionsSeen: 5,
          maxConcurrentSessions: 2,
          seenSessionIds: ["a", "b"],
          // seenProjects / currentStreakDays / longestStreakDays / lastActiveDate
          // didn't exist in this older format.
        }),
      },
    })
    const t = new SessionStatsTracker({ fs, path: "/data/session-stats.json" })

    expect(t.record(sessions({ a: {} }), DAY1)).not.toBeInstanceOf(Error)
    const result = must(t.record(sessions({ a: {} }), DAY2))

    expect(result.totalSessionsSeen).toBe(5)
    expect(result.uniqueProjectsSeen).toBe(0)
    expect(result.currentStreakDays).toBe(2)
  })

  it("persists totals across tracker instances sharing the same fs", () => {
    const fs = new MemoryMinionFileSystem()
    new SessionStatsTracker({ fs, path: "/data/session-stats.json" }).record(
      sessions({ a: {}, b: {} }),
      DAY1,
    )

    const reopened = new SessionStatsTracker({ fs, path: "/data/session-stats.json" })
    expect(reopened.summary().totalSessionsSeen).toBe(2)
  })
})
