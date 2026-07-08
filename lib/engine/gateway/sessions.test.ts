import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@/lib/engine/fs/memory-file-system.ts"
import { MemoryMinionProcessRunner } from "@/lib/engine/process/memory-process-runner.ts"
import { MemoryMinionClock } from "@/lib/engine/time/memory-clock.ts"
import { readActiveSessions } from "@/lib/engine/gateway/sessions.ts"

const DIR = "/home/.claude/sessions"
const PROJECTS_DIR = "/home/.claude/projects"

function setup(files: Record<string, string>) {
  const clock = new MemoryMinionClock({ start: new Date(1_000_000) })
  const fs = new MemoryMinionFileSystem({ files, now: () => clock.millis() })
  const process = new MemoryMinionProcessRunner()
  return { fs, process, clock, projectsDir: PROJECTS_DIR }
}

describe("readActiveSessions", () => {
  it("returns an empty map when the sessions directory doesn't exist", () => {
    const fixture = setup({})
    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })
    expect(sessions.size).toBe(0)
  })

  it("marks a busy session on a live pid as running", () => {
    const fixture = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "busy", name: "repo" }),
    })
    fixture.process.setAlivePids([1])

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: true, name: "repo", cwd: undefined })
  })

  it("marks an idle session on a live pid as not running", () => {
    const fixture = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "idle", name: "repo" }),
    })
    fixture.process.setAlivePids([1])

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: false, name: "repo", cwd: undefined })
  })

  it("records the session's cwd when present", () => {
    const fixture = setup({
      [`${DIR}/a.json`]: JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        cwd: "/Users/n/project",
      }),
    })
    fixture.process.setAlivePids([1])

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.get("a")?.cwd).toBe("/Users/n/project")
  })

  it("keeps a dead session's last state within the stale window", () => {
    const fixture = setup({})
    // pid not in the alive set — process is dead
    fixture.fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        updatedAt: fixture.clock.millis() - 1000,
      }),
    )

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.get("a")).toEqual({ running: false, name: "", cwd: undefined })
  })

  it("drops a dead session once past the stale window", () => {
    const fixture = setup({})
    fixture.fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        updatedAt: fixture.clock.millis() - 1000,
      }),
    )

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR, staleMs: 500 })

    expect(sessions.has("a")).toBe(false)
  })

  it("falls back to statusUpdatedAt then startedAt when updatedAt is absent", () => {
    const fixture = setup({})
    fixture.fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        startedAt: fixture.clock.millis() - 1000,
      }),
    )

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.has("a")).toBe(true)
  })

  it("skips a session file missing sessionId or pid", () => {
    const fixture = setup({
      [`${DIR}/a.json`]: JSON.stringify({ pid: 1, status: "busy" }),
    })

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.size).toBe(0)
  })

  it("skips a malformed session file instead of throwing", () => {
    const fixture = setup({ [`${DIR}/a.json`]: "not json" })

    expect(() => readActiveSessions({ ...fixture, sessionsDir: DIR })).not.toThrow()
  })

  it("ignores non-json files in the sessions directory", () => {
    const fixture = setup({ [`${DIR}/README.md`]: "hi" })

    const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

    expect(sessions.size).toBe(0)
  })

  // claude-desktopのセッションファイルはstatusを一切書かないので、
  // トランスクリプトのmtimeが稼働シグナルになる。
  describe("statusless sessions (claude-desktop)", () => {
    const TRANSCRIPT = `${PROJECTS_DIR}/-Users-n-my-app/a.jsonl`
    const sessionFile = JSON.stringify({
      sessionId: "a",
      pid: 1,
      name: "my-app",
      cwd: "/Users/n/my-app",
    })

    it("marks the session running while its transcript was written recently", () => {
      const fixture = setup({
        [`${DIR}/a.json`]: sessionFile,
        [TRANSCRIPT]: "{}\n",
      })
      fixture.process.setAlivePids([1])
      fixture.fs.setMtime(TRANSCRIPT, fixture.clock.millis() - 30_000)

      const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

      expect(sessions.get("a")?.running).toBe(true)
    })

    it("marks the session sleeping once the transcript goes quiet", () => {
      const fixture = setup({
        [`${DIR}/a.json`]: sessionFile,
        [TRANSCRIPT]: "{}\n",
      })
      fixture.process.setAlivePids([1])
      fixture.fs.setMtime(TRANSCRIPT, fixture.clock.millis() - 10 * 60 * 1000)

      const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

      expect(sessions.get("a")?.running).toBe(false)
    })

    it("flattens dots in the cwd when resolving the transcript directory", () => {
      const transcript = `${PROJECTS_DIR}/-Users-n--claude-worktrees-x/a.jsonl`
      const fixture = setup({
        [`${DIR}/a.json`]: JSON.stringify({
          sessionId: "a",
          pid: 1,
          cwd: "/Users/n/.claude/worktrees/x",
        }),
        [transcript]: "{}\n",
      })
      fixture.process.setAlivePids([1])
      fixture.fs.setMtime(transcript, fixture.clock.millis() - 1000)

      const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

      expect(sessions.get("a")?.running).toBe(true)
    })

    it("marks the session sleeping when the transcript is missing or cwd is unknown", () => {
      const fixture = setup({
        [`${DIR}/a.json`]: sessionFile,
        [`${DIR}/b.json`]: JSON.stringify({ sessionId: "b", pid: 2 }),
      })
      fixture.process.setAlivePids([1, 2])

      const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

      expect(sessions.get("a")?.running).toBe(false)
      expect(sessions.get("b")?.running).toBe(false)
    })

    it("still trusts an explicit idle status over a fresh transcript", () => {
      const fixture = setup({
        [`${DIR}/a.json`]: JSON.stringify({
          sessionId: "a",
          pid: 1,
          status: "idle",
          cwd: "/Users/n/my-app",
        }),
        [TRANSCRIPT]: "{}\n",
      })
      fixture.process.setAlivePids([1])
      fixture.fs.setMtime(TRANSCRIPT, fixture.clock.millis())

      const sessions = readActiveSessions({ ...fixture, sessionsDir: DIR })

      expect(sessions.get("a")?.running).toBe(false)
    })
  })
})
