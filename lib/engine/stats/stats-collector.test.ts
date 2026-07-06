import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { MemoryMinionClock } from "@lib/engine/time/memory-clock"
import { SessionStatsTracker } from "@lib/engine/stats/session-stats-tracker"
import { TokenUsageTracker } from "@lib/engine/stats/token-usage-tracker"
import { MinionStatsCollector } from "@lib/engine/stats/stats-collector"

const SESSIONS_DIR = "/home/.claude/sessions"
const PROJECTS_DIR = "/home/.claude/projects"

function usageLine(input: number, output: number, date: string): string {
  return JSON.stringify({
    message: { usage: { input_tokens: input, output_tokens: output } },
    timestamp: `${date}T12:00:00.000Z`,
  })
}

function collector(
  fs: MemoryMinionFileSystem,
  clock: MemoryMinionClock,
  process: MemoryMinionProcessRunner = new MemoryMinionProcessRunner(),
) {
  return new MinionStatsCollector({
    fs,
    process,
    clock,
    sessionsDir: SESSIONS_DIR,
    sessionStats: new SessionStatsTracker({ fs, path: "/data/session-stats.json" }),
    tokenUsage: new TokenUsageTracker({ fs, path: "/data/usage.json", projectsDir: PROJECTS_DIR }),
  })
}

describe("MinionStatsCollector", () => {
  it("starts at zero with the correct time bucket", () => {
    // Constructed via local-time fields (not a UTC ISO string) so `hour` is
    // stable regardless of which timezone the test runs in.
    const clock = new MemoryMinionClock({ start: new Date(2026, 6, 6, 21, 30, 0) })
    const snapshot = collector(new MemoryMinionFileSystem(), clock).collect()

    expect(snapshot.currentConcurrentSessions).toBe(0)
    expect(snapshot.maxConcurrentSessions).toBe(0)
    expect(snapshot.totalSessionsSeen).toBe(0)
    expect(snapshot.tokensTotal).toBe(0)
    expect(snapshot.tokensToday).toBe(0)
    expect(snapshot.tokensThisWeek).toBe(0)
    expect(snapshot.uniqueProjectsSeen).toBe(0)
    expect(snapshot.currentStreakDays).toBe(0)
    expect(snapshot.longestStreakDays).toBe(0)
    expect(snapshot.hour).toBe(21)
    expect(snapshot.timeBucket).toBe("night")
  })

  it("combines active sessions and today's token usage", () => {
    const clock = new MemoryMinionClock({ start: new Date("2026-07-06T12:00:00.000Z") })
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${SESSIONS_DIR}/1.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "busy" }),
        [`${SESSIONS_DIR}/2.json`]: JSON.stringify({ sessionId: "b", pid: 2, status: "idle" }),
        [`${PROJECTS_DIR}/proj/a.jsonl`]: [
          usageLine(10, 5, "2026-07-06"),
          usageLine(100, 50, "2026-07-01"),
        ].join("\n"),
      },
    })
    const process = new MemoryMinionProcessRunner()
    process.setAlivePids([1, 2])
    const stats = collector(fs, clock, process)

    const snapshot = stats.collect()

    expect(snapshot.currentConcurrentSessions).toBe(2)
    expect(snapshot.totalSessionsSeen).toBe(2)
    expect(snapshot.tokensTotal).toBe(165)
    expect(snapshot.tokensToday).toBe(15) // only the 2026-07-06 line
    expect(snapshot.tokensThisWeek).toBe(165) // both lines fall within the trailing 7 days
    expect(snapshot.currentStreakDays).toBe(1)
  })

  it("excludes token usage older than the rolling 7-day window from tokensThisWeek", () => {
    const clock = new MemoryMinionClock({ start: new Date("2026-07-06T12:00:00.000Z") })
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${PROJECTS_DIR}/proj/a.jsonl`]: [
          usageLine(10, 5, "2026-07-06"), // within the window
          usageLine(100, 50, "2026-06-01"), // 5+ weeks ago
        ].join("\n"),
      },
    })
    const stats = collector(fs, clock)

    const snapshot = stats.collect()

    expect(snapshot.tokensTotal).toBe(165)
    expect(snapshot.tokensThisWeek).toBe(15)
  })

  it("counts distinct project directories across sessions", () => {
    const clock = new MemoryMinionClock({ start: new Date("2026-07-06T12:00:00.000Z") })
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${SESSIONS_DIR}/1.json`]: JSON.stringify({
          sessionId: "a",
          pid: 1,
          status: "busy",
          cwd: "/repo-a",
        }),
      },
    })
    const process = new MemoryMinionProcessRunner()
    process.setAlivePids([1])

    const snapshot = collector(fs, clock, process).collect()

    expect(snapshot.uniqueProjectsSeen).toBe(1)
  })

  it("peek() reads persisted totals without re-scanning sessions or transcripts", () => {
    const clock = new MemoryMinionClock({ start: new Date("2026-07-06T12:00:00.000Z") })
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${SESSIONS_DIR}/1.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "busy" }),
        [`${PROJECTS_DIR}/proj/a.jsonl`]: usageLine(10, 5, "2026-07-06"),
      },
    })
    const process = new MemoryMinionProcessRunner()
    process.setAlivePids([1])
    const stats = collector(fs, clock, process)
    stats.collect()

    const snapshot = stats.peek()

    expect(snapshot.totalSessionsSeen).toBe(1)
    expect(snapshot.currentConcurrentSessions).toBe(0) // peek() never re-reads live sessions
    expect(snapshot.tokensTotal).toBe(15)
  })
})
