import { join } from "node:path"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import type { MinionProcessRunner } from "@lib/engine/process/process-runner"
import type { MinionClock } from "@lib/engine/time/clock"

const DEFAULT_STALE_MS = 8 * 60 * 1000

export type SessionInfo = {
  running: boolean
  name: string
  /** The session's working directory, when Claude Code recorded one — used to count distinct projects worked in. */
  cwd?: string
}

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  clock: MinionClock
  sessionsDir: string
  /** How long a dead session's last-known status is trusted before it's dropped. Defaults to 8 minutes. */
  staleMs?: number
}

/**
 * Reads every `~/.claude/sessions/*.json` file and resolves each into a
 * running/idle verdict. updatedAt only changes when status flips, so a
 * session that's been busy for a long time can't be judged by elapsed time
 * alone — while its process is alive we trust `status` directly, and only
 * fall back to the `staleMs` grace period once the process has died.
 */
export function readActiveSessions(props: Props): Map<string, SessionInfo> {
  const staleMs = props.staleMs ?? DEFAULT_STALE_MS

  let files: string[]
  try {
    files = props.fs.readdirSync(props.sessionsDir).filter((f) => f.endsWith(".json"))
  } catch {
    return new Map()
  }

  const now = props.clock.millis()
  const result = new Map<string, SessionInfo>()

  for (const file of files) {
    try {
      const raw = JSON.parse(props.fs.readFileSync(join(props.sessionsDir, file)))
      if (typeof raw.sessionId !== "string" || typeof raw.pid !== "number") continue

      const alive = props.process.isAlive(raw.pid)
      if (!alive) {
        const updatedAt = raw.updatedAt ?? raw.statusUpdatedAt ?? raw.startedAt
        if (typeof updatedAt !== "number" || now - updatedAt > staleMs) continue
      }

      result.set(raw.sessionId, {
        running: alive && raw.status === "busy",
        name: typeof raw.name === "string" ? raw.name : "",
        cwd: typeof raw.cwd === "string" ? raw.cwd : undefined,
      })
    } catch {
      // 書き込み途中などで壊れているファイルは無視
    }
  }

  return result
}
