import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { MemoryMinionClock } from "@lib/engine/time/memory-clock"
import { readActiveSessions } from "@lib/engine/gateway/sessions"

const DIR = "/home/.claude/sessions"

function setup(files: Record<string, string>) {
  const fs = new MemoryMinionFileSystem({ files })
  const process = new MemoryMinionProcessRunner()
  const clock = new MemoryMinionClock({ start: new Date(1_000_000) })
  return { fs, process, clock }
}

describe("readActiveSessions", () => {
  it("returns an empty map when the sessions directory doesn't exist", () => {
    const { fs, process, clock } = setup({})
    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })
    expect(sessions.size).toBe(0)
  })

  it("marks a busy session on a live pid as running", () => {
    const { fs, process, clock } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "busy", name: "repo" }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: true, name: "repo", cwd: undefined })
  })

  it("marks an idle session on a live pid as not running", () => {
    const { fs, process, clock } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "idle", name: "repo" }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: false, name: "repo", cwd: undefined })
  })

  it("records the session's cwd when present", () => {
    const { fs, process, clock } = setup({
      [`${DIR}/a.json`]: JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        cwd: "/Users/n/project",
      }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.get("a")?.cwd).toBe("/Users/n/project")
  })

  it("keeps a dead session's last state within the stale window", () => {
    const { fs, process, clock } = setup({})
    // pid not in the alive set — process is dead
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", updatedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: false, name: "", cwd: undefined })
  })

  it("drops a dead session once past the stale window", () => {
    const { fs, process, clock } = setup({})
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", updatedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, staleMs: 500 })

    expect(sessions.has("a")).toBe(false)
  })

  it("falls back to statusUpdatedAt then startedAt when updatedAt is absent", () => {
    const { fs, process, clock } = setup({})
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", startedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.has("a")).toBe(true)
  })

  it("skips a session file missing sessionId or pid", () => {
    const { fs, process, clock } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ pid: 1, status: "busy" }),
    })

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.size).toBe(0)
  })

  it("skips a malformed session file instead of throwing", () => {
    const { fs, process, clock } = setup({ [`${DIR}/a.json`]: "not json" })

    expect(() => readActiveSessions({ fs, process, clock, sessionsDir: DIR })).not.toThrow()
  })

  it("ignores non-json files in the sessions directory", () => {
    const { fs, process, clock } = setup({ [`${DIR}/README.md`]: "hi" })

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR })

    expect(sessions.size).toBe(0)
  })
})
