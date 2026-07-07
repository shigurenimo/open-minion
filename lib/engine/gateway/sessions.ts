import { join } from "node:path"
import { z } from "zod"
import { safeJsonParse } from "../errors"
import type { MinionFileSystem } from "../fs/file-system"
import type { MinionProcessRunner } from "../process/process-runner"
import type { MinionClock } from "../time/clock"

const DEFAULT_STALE_MS = 8 * 60 * 1000
const DEFAULT_TRANSCRIPT_ACTIVE_MS = 2 * 60 * 1000

// One `~/.claude/sessions/*.json` file. `sessionId` and `pid` are required to
// identify the session at all; everything else degrades gracefully (`.catch()`)
// since these files are written by Claude Code, not by us. `status` stays
// `undefined` when absent — claude-desktop sessions never write it, and
// "no status" (fall back to transcript activity) must stay distinguishable
// from "status: idle".
const sessionFileSchema = z.looseObject({
  sessionId: z.string(),
  pid: z.number(),
  status: z.string().optional().catch(undefined),
  name: z.string().catch(""),
  cwd: z.string().optional().catch(undefined),
  updatedAt: z.number().optional().catch(undefined),
  statusUpdatedAt: z.number().optional().catch(undefined),
  startedAt: z.number().optional().catch(undefined),
})

export type SessionInfo = {
  running: boolean
  name: string
  /** The session's working directory, when Claude Code recorded one — used to count distinct projects worked in. */
  cwd?: string
  /** Set when the subject is doing something more specific than "busy" — e.g. a Discord friend playing a game. */
  activity?: "gaming"
}

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  clock: MinionClock
  sessionsDir: string
  /** Claude Code's transcript root (`~/.claude/projects`) — the busy signal for sessions whose file has no `status`. */
  projectsDir: string
  /** How long a dead session's last-known status is trusted before it's dropped. Defaults to 8 minutes. */
  staleMs?: number
  /** How recent a transcript write counts as "busy" for statusless sessions. Defaults to 2 minutes. */
  transcriptActiveMs?: number
}

/**
 * Reads every `~/.claude/sessions/*.json` file and resolves each into a
 * running/idle verdict. updatedAt only changes when status flips, so a
 * session that's been busy for a long time can't be judged by elapsed time
 * alone — while its process is alive we trust `status` directly, and only
 * fall back to the `staleMs` grace period once the process has died.
 *
 * claude-desktop sessions write their file once at startup and never include
 * `status` at all, so for those the transcript file's mtime is the busy
 * signal instead: the transcript is appended to continuously while Claude
 * works, so a write within `transcriptActiveMs` means the session is running.
 *
 * An unreadable directory reads as "no sessions", and a file that's missing,
 * mid-write, or shaped wrong is skipped — session files churn constantly and
 * none of that is an error worth surfacing.
 */
export function readActiveSessions(props: Props): Map<string, SessionInfo> {
  const staleMs = props.staleMs ?? DEFAULT_STALE_MS

  const entries = props.fs.readdirSync(props.sessionsDir)
  if (entries instanceof Error) return new Map()

  const now = props.clock.millis()
  const result = new Map<string, SessionInfo>()

  for (const file of entries.filter((f) => f.endsWith(".json"))) {
    const content = props.fs.readFileSync(join(props.sessionsDir, file))
    if (content instanceof Error) continue

    const json = safeJsonParse(content)
    if (json instanceof Error) continue

    const parsed = sessionFileSchema.safeParse(json)
    if (!parsed.success) continue
    const session = parsed.data

    const alive = props.process.isAlive(session.pid)
    if (!alive) {
      const updatedAt = session.updatedAt ?? session.statusUpdatedAt ?? session.startedAt
      if (updatedAt === undefined || now - updatedAt > staleMs) continue
    }

    const busy =
      session.status !== undefined
        ? session.status === "busy"
        : isTranscriptActive({
            fs: props.fs,
            projectsDir: props.projectsDir,
            cwd: session.cwd,
            sessionId: session.sessionId,
            now,
            activeMs: props.transcriptActiveMs ?? DEFAULT_TRANSCRIPT_ACTIVE_MS,
          })

    result.set(session.sessionId, {
      running: alive && busy,
      name: session.name,
      cwd: session.cwd,
    })
  }

  return result
}

// Claude Code stores each transcript at
// `<projectsDir>/<cwd with "/" and "." flattened to "-">/<sessionId>.jsonl`.
function isTranscriptActive(props: {
  fs: MinionFileSystem
  projectsDir: string
  cwd: string | undefined
  sessionId: string
  now: number
  activeMs: number
}): boolean {
  if (props.cwd === undefined) return false
  const projectDir = props.cwd.replace(/[/\\.:]/g, "-")
  const stat = props.fs.statSync(join(props.projectsDir, projectDir, `${props.sessionId}.jsonl`))
  if (stat instanceof Error) return false
  return props.now - stat.mtimeMs <= props.activeMs
}
