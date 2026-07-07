import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "../fs/memory-file-system.ts"
import { MemoryMinionClock } from "../time/memory-clock.ts"
import { TokenUsageTracker } from "./token-usage-tracker.ts"

function must<T>(value: T | Error): T {
  if (value instanceof Error) throw value
  return value
}

const PROJECTS_DIR = "/home/.claude/projects"
const DAY_MS = 24 * 60 * 60 * 1000

function usageLine(input: number, output: number, date: string): string {
  return JSON.stringify({
    message: { usage: { input_tokens: input, output_tokens: output } },
    timestamp: `${date}T00:00:00.000Z`,
  })
}

/** Tracker whose clock sits at `clockMs` — mtimes stamped by the fs's own `now` stay within the backfill window as long as they aren't set far in the past. */
function tracker(fs: MemoryMinionFileSystem, clockMs = 0): TokenUsageTracker {
  return new TokenUsageTracker({
    fs,
    clock: new MemoryMinionClock({ start: new Date(clockMs) }),
    path: "/data/usage.json",
    projectsDir: PROJECTS_DIR,
  })
}

describe("TokenUsageTracker", () => {
  it("returns zero when no transcripts exist", () => {
    expect(tracker(new MemoryMinionFileSystem()).scan()).toEqual({
      tokensTotal: 0,
      tokensByDate: {},
    })
  })

  it("sums usage across every transcript line and buckets by date", () => {
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${PROJECTS_DIR}/proj/a.jsonl`]: [
          usageLine(10, 5, "2026-07-01"),
          usageLine(100, 50, "2026-07-02"),
        ].join("\n"),
      },
    })

    const summary = must(tracker(fs).scan())

    expect(summary.tokensTotal).toBe(165)
    expect(summary.tokensByDate).toEqual({ "2026-07-01": 15, "2026-07-02": 150 })
  })

  it("ignores non-jsonl files, malformed lines, and lines without usage", () => {
    const fs = new MemoryMinionFileSystem({
      files: {
        [`${PROJECTS_DIR}/proj/notes.txt`]: usageLine(999, 999, "2026-07-01"),
        [`${PROJECTS_DIR}/proj/a.jsonl`]: [
          "not json",
          JSON.stringify({ message: { content: "no usage here" } }),
          usageLine(10, 5, "2026-07-01"),
        ].join("\n"),
      },
    })

    expect(must(tracker(fs).scan()).tokensTotal).toBe(15)
  })

  it("skips an unseen transcript whose mtime is older than the 7-day backfill window", () => {
    const nowMs = 30 * DAY_MS
    const fs = new MemoryMinionFileSystem({ now: () => nowMs })
    const oldFile = `${PROJECTS_DIR}/proj/old.jsonl`
    const recentFile = `${PROJECTS_DIR}/proj/recent.jsonl`
    fs.writeFileSync(oldFile, usageLine(1000, 0, "2026-06-01"))
    fs.writeFileSync(recentFile, usageLine(10, 5, "2026-07-06"))
    fs.setMtime(oldFile, nowMs - 8 * DAY_MS)
    fs.setMtime(recentFile, nowMs - 1 * DAY_MS)

    const summary = must(tracker(fs, nowMs).scan())

    expect(summary.tokensTotal).toBe(15) // only the recent file was read
  })

  it("counts an old file once it turns recent again (mtime moves inside the window)", () => {
    const nowMs = 30 * DAY_MS
    const fs = new MemoryMinionFileSystem({ now: () => nowMs })
    const path = `${PROJECTS_DIR}/proj/a.jsonl`
    fs.writeFileSync(path, usageLine(10, 5, "2026-07-06"))
    fs.setMtime(path, nowMs - 8 * DAY_MS)
    const t = tracker(fs, nowMs)

    expect(must(t.scan()).tokensTotal).toBe(0) // too old — skipped

    fs.setMtime(path, nowMs) // appended "now"
    expect(must(t.scan()).tokensTotal).toBe(15)
  })

  it("skips re-reading a file whose mtime hasn't changed since the last scan", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    const path = `${PROJECTS_DIR}/proj/a.jsonl`
    fs.writeFileSync(path, `${usageLine(10, 5, "2026-07-01")}\n`)
    const t = tracker(fs)

    expect(must(t.scan()).tokensTotal).toBe(15)

    // Append a line without advancing the clock, so the mtime the tracker
    // sees is identical to last time — it should skip this file entirely.
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(100, 50, "2026-07-02")}\n`,
    )
    expect(must(t.scan()).tokensTotal).toBe(15)

    // Advance the clock and touch the file again — now the appended line is picked up.
    now = 2000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(100, 50, "2026-07-02")}\n`,
    )
    expect(must(t.scan()).tokensTotal).toBe(165)
  })

  it("does not double-count already-consumed lines across scans", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    const path = `${PROJECTS_DIR}/proj/a.jsonl`
    fs.writeFileSync(path, `${usageLine(10, 5, "2026-07-01")}\n`)
    const t = tracker(fs)
    t.scan()

    now = 2000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(20, 10, "2026-07-01")}\n`,
    )
    const second = must(t.scan())

    now = 3000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(20, 10, "2026-07-01")}\n${usageLine(1, 1, "2026-07-03")}\n`,
    )
    const third = must(t.scan())

    expect(second.tokensTotal).toBe(45) // 15 + 30, first line not recounted
    expect(third.tokensTotal).toBe(47) // + 2, earlier lines still not recounted
  })

  it("persists totals across tracker instances sharing the same fs", () => {
    const fs = new MemoryMinionFileSystem({
      files: { [`${PROJECTS_DIR}/proj/a.jsonl`]: usageLine(10, 5, "2026-07-01") },
    })
    tracker(fs).scan()

    expect(tracker(fs).summary()).toEqual({ tokensTotal: 15, tokensByDate: { "2026-07-01": 15 } })
  })

  it("summary() reflects the last scan without touching the transcripts", () => {
    const fs = new MemoryMinionFileSystem({
      files: { [`${PROJECTS_DIR}/proj/a.jsonl`]: usageLine(10, 5, "2026-07-01") },
    })
    const t = tracker(fs)
    t.scan()

    expect(t.summary()).toEqual({ tokensTotal: 15, tokensByDate: { "2026-07-01": 15 } })
  })
})
