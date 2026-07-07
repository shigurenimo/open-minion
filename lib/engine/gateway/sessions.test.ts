import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { MemoryMinionClock } from "@lib/engine/time/memory-clock"
import { readActiveSessions } from "@lib/engine/gateway/sessions"

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
    const { fs, process, clock, projectsDir } = setup({})
    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })
    expect(sessions.size).toBe(0)
  })

  it("marks a busy session on a live pid as running", () => {
    const { fs, process, clock, projectsDir } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "busy", name: "repo" }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.get("a")).toEqual({ running: true, name: "repo", cwd: undefined })
  })

  it("marks an idle session on a live pid as not running", () => {
    const { fs, process, clock, projectsDir } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ sessionId: "a", pid: 1, status: "idle", name: "repo" }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.get("a")).toEqual({ running: false, name: "repo", cwd: undefined })
  })

  it("records the session's cwd when present", () => {
    const { fs, process, clock, projectsDir } = setup({
      [`${DIR}/a.json`]: JSON.stringify({
        sessionId: "a",
        pid: 1,
        status: "busy",
        cwd: "/Users/n/project",
      }),
    })
    process.setAlivePids([1])

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.get("a")?.cwd).toBe("/Users/n/project")
  })

  it("keeps a dead session's last state within the stale window", () => {
    const { fs, process, clock, projectsDir } = setup({})
    // pid not in the alive set — process is dead
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", updatedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.get("a")).toEqual({ running: false, name: "", cwd: undefined })
  })

  it("drops a dead session once past the stale window", () => {
    const { fs, process, clock, projectsDir } = setup({})
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", updatedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({
      fs,
      process,
      clock,
      sessionsDir: DIR,
      projectsDir,
      staleMs: 500,
    })

    expect(sessions.has("a")).toBe(false)
  })

  it("falls back to statusUpdatedAt then startedAt when updatedAt is absent", () => {
    const { fs, process, clock, projectsDir } = setup({})
    fs.writeFileSync(
      `${DIR}/a.json`,
      JSON.stringify({ sessionId: "a", pid: 1, status: "busy", startedAt: clock.millis() - 1000 }),
    )

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.has("a")).toBe(true)
  })

  it("skips a session file missing sessionId or pid", () => {
    const { fs, process, clock, projectsDir } = setup({
      [`${DIR}/a.json`]: JSON.stringify({ pid: 1, status: "busy" }),
    })

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

    expect(sessions.size).toBe(0)
  })

  it("skips a malformed session file instead of throwing", () => {
    const { fs, process, clock, projectsDir } = setup({ [`${DIR}/a.json`]: "not json" })

    expect(() =>
      readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir }),
    ).not.toThrow()
  })

  it("ignores non-json files in the sessions directory", () => {
    const { fs, process, clock, projectsDir } = setup({ [`${DIR}/README.md`]: "hi" })

    const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

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
      const { fs, process, clock, projectsDir } = setup({
        [`${DIR}/a.json`]: sessionFile,
        [TRANSCRIPT]: "{}\n",
      })
      process.setAlivePids([1])
      fs.setMtime(TRANSCRIPT, clock.millis() - 30_000)

      const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

      expect(sessions.get("a")?.running).toBe(true)
    })

    it("marks the session sleeping once the transcript goes quiet", () => {
      const { fs, process, clock, projectsDir } = setup({
        [`${DIR}/a.json`]: sessionFile,
        [TRANSCRIPT]: "{}\n",
      })
      process.setAlivePids([1])
      fs.setMtime(TRANSCRIPT, clock.millis() - 10 * 60 * 1000)

      const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

      expect(sessions.get("a")?.running).toBe(false)
    })

    it("flattens dots in the cwd when resolving the transcript directory", () => {
      const transcript = `${PROJECTS_DIR}/-Users-n--claude-worktrees-x/a.jsonl`
      const { fs, process, clock, projectsDir } = setup({
        [`${DIR}/a.json`]: JSON.stringify({
          sessionId: "a",
          pid: 1,
          cwd: "/Users/n/.claude/worktrees/x",
        }),
        [transcript]: "{}\n",
      })
      process.setAlivePids([1])
      fs.setMtime(transcript, clock.millis() - 1000)

      const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

      expect(sessions.get("a")?.running).toBe(true)
    })

    it("marks the session sleeping when the transcript is missing or cwd is unknown", () => {
      const { fs, process, clock, projectsDir } = setup({
        [`${DIR}/a.json`]: sessionFile,
        [`${DIR}/b.json`]: JSON.stringify({ sessionId: "b", pid: 2 }),
      })
      process.setAlivePids([1, 2])

      const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

      expect(sessions.get("a")?.running).toBe(false)
      expect(sessions.get("b")?.running).toBe(false)
    })

    it("still trusts an explicit idle status over a fresh transcript", () => {
      const { fs, process, clock, projectsDir } = setup({
        [`${DIR}/a.json`]: JSON.stringify({
          sessionId: "a",
          pid: 1,
          status: "idle",
          cwd: "/Users/n/my-app",
        }),
        [TRANSCRIPT]: "{}\n",
      })
      process.setAlivePids([1])
      fs.setMtime(TRANSCRIPT, clock.millis())

      const sessions = readActiveSessions({ fs, process, clock, sessionsDir: DIR, projectsDir })

      expect(sessions.get("a")?.running).toBe(false)
    })
  })
})
