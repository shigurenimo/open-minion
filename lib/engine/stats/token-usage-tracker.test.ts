import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { TokenUsageTracker } from "@lib/engine/stats/token-usage-tracker"

const PROJECTS_DIR = "/home/.claude/projects"

function usageLine(input: number, output: number, date: string): string {
  return JSON.stringify({
    message: { usage: { input_tokens: input, output_tokens: output } },
    timestamp: `${date}T00:00:00.000Z`,
  })
}

describe("TokenUsageTracker", () => {
  it("returns zero when no transcripts exist", () => {
    const tracker = new TokenUsageTracker({
      fs: new MemoryMinionFileSystem(),
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })
    expect(tracker.scan()).toEqual({ tokensTotal: 0, tokensByDate: {} })
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
    const tracker = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })

    const summary = tracker.scan()

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
    const tracker = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })

    expect(tracker.scan().tokensTotal).toBe(15)
  })

  it("skips re-reading a file whose mtime hasn't changed since the last scan", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    const path = `${PROJECTS_DIR}/proj/a.jsonl`
    fs.writeFileSync(path, `${usageLine(10, 5, "2026-07-01")}\n`)
    const tracker = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })

    expect(tracker.scan().tokensTotal).toBe(15)

    // Append a line without advancing the clock, so the mtime the tracker
    // sees is identical to last time — it should skip this file entirely.
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(100, 50, "2026-07-02")}\n`,
    )
    expect(tracker.scan().tokensTotal).toBe(15)

    // Advance the clock and touch the file again — now the appended line is picked up.
    now = 2000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(100, 50, "2026-07-02")}\n`,
    )
    expect(tracker.scan().tokensTotal).toBe(165)
  })

  it("does not double-count already-consumed lines across scans", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    const path = `${PROJECTS_DIR}/proj/a.jsonl`
    fs.writeFileSync(path, `${usageLine(10, 5, "2026-07-01")}\n`)
    const tracker = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })
    tracker.scan()

    now = 2000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(20, 10, "2026-07-01")}\n`,
    )
    const second = tracker.scan()

    now = 3000
    fs.writeFileSync(
      path,
      `${usageLine(10, 5, "2026-07-01")}\n${usageLine(20, 10, "2026-07-01")}\n${usageLine(1, 1, "2026-07-03")}\n`,
    )
    const third = tracker.scan()

    expect(second.tokensTotal).toBe(45) // 15 + 30, first line not recounted
    expect(third.tokensTotal).toBe(47) // + 2, earlier lines still not recounted
  })

  it("persists totals across tracker instances sharing the same fs", () => {
    const fs = new MemoryMinionFileSystem({
      files: { [`${PROJECTS_DIR}/proj/a.jsonl`]: usageLine(10, 5, "2026-07-01") },
    })
    new TokenUsageTracker({ fs, path: "/data/usage.json", projectsDir: PROJECTS_DIR }).scan()

    const reopened = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })
    expect(reopened.summary()).toEqual({ tokensTotal: 15, tokensByDate: { "2026-07-01": 15 } })
  })

  it("summary() reflects the last scan without touching the transcripts", () => {
    const fs = new MemoryMinionFileSystem({
      files: { [`${PROJECTS_DIR}/proj/a.jsonl`]: usageLine(10, 5, "2026-07-01") },
    })
    const tracker = new TokenUsageTracker({
      fs,
      path: "/data/usage.json",
      projectsDir: PROJECTS_DIR,
    })
    tracker.scan()

    expect(tracker.summary()).toEqual({ tokensTotal: 15, tokensByDate: { "2026-07-01": 15 } })
  })
})
