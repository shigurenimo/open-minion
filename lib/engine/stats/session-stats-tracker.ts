import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"
import type { SessionInfo } from "@lib/engine/gateway/sessions"
import { isNextDay } from "@lib/engine/stats/date-window"

type SessionStatsData = {
  totalSessionsSeen: number
  maxConcurrentSessions: number
  /** Bounded, most-recent-first log of distinct session ids, used only to dedup lifetime counting across restarts. */
  seenSessionIds: string[]
  /** Bounded log of distinct working directories seen, used only to dedup `uniqueProjectsSeen` across restarts. */
  seenProjects: string[]
  currentStreakDays: number
  longestStreakDays: number
  /** "YYYY-MM-DD" (UTC) of the last `record()` call that saw at least one active session. */
  lastActiveDate: string | null
}

const EMPTY: SessionStatsData = {
  totalSessionsSeen: 0,
  maxConcurrentSessions: 0,
  seenSessionIds: [],
  seenProjects: [],
  currentStreakDays: 0,
  longestStreakDays: 0,
  lastActiveDate: null,
}

// Bounds the dedup logs' size; an id/project aged out here can be recounted
// as "new" if it somehow reappears, which only over-counts figures that are
// already just fun numbers, not something that needs to be exact.
const MAX_SEEN_IDS = 5000
const MAX_SEEN_PROJECTS = 2000

export type SessionStatsSummary = {
  totalSessionsSeen: number
  currentConcurrentSessions: number
  maxConcurrentSessions: number
  uniqueProjectsSeen: number
  currentStreakDays: number
  longestStreakDays: number
}

/**
 * Tracks lifetime distinct session/project counts, the concurrency
 * high-water-mark, and a day-streak of "was any session active that day",
 * all persisted across gateway restarts.
 */
export class SessionStatsTracker {
  private readonly store: JsonFileStore<SessionStatsData>

  constructor(props: { fs: MinionFileSystem; path: string }) {
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, defaultValue: EMPTY })
  }

  /** Records the latest active-session snapshot (at `now`) and returns the updated summary. */
  record(activeSessions: Map<string, SessionInfo>, now: Date): SessionStatsSummary {
    const data = normalize(this.store.read())
    const seenIds = new Set(data.seenSessionIds)
    const seenProjects = new Set(data.seenProjects)

    for (const info of activeSessions.values()) {
      if (info.cwd) seenProjects.add(info.cwd)
    }

    for (const id of activeSessions.keys()) {
      if (seenIds.has(id)) continue
      seenIds.add(id)
      data.totalSessionsSeen += 1
    }

    data.seenSessionIds = Array.from(seenIds).slice(-MAX_SEEN_IDS)
    data.seenProjects = Array.from(seenProjects).slice(-MAX_SEEN_PROJECTS)
    data.maxConcurrentSessions = Math.max(data.maxConcurrentSessions, activeSessions.size)

    if (activeSessions.size > 0) {
      this.recordActiveDay(data, now.toISOString().slice(0, 10))
    }

    this.store.write(data)

    return {
      totalSessionsSeen: data.totalSessionsSeen,
      currentConcurrentSessions: activeSessions.size,
      maxConcurrentSessions: data.maxConcurrentSessions,
      uniqueProjectsSeen: data.seenProjects.length,
      currentStreakDays: data.currentStreakDays,
      longestStreakDays: data.longestStreakDays,
    }
  }

  /** Persisted totals without recording a new sample; `currentConcurrentSessions` is always 0 here since no live sessions were read. */
  summary(): SessionStatsSummary {
    const data = normalize(this.store.read())
    return {
      totalSessionsSeen: data.totalSessionsSeen,
      currentConcurrentSessions: 0,
      maxConcurrentSessions: data.maxConcurrentSessions,
      uniqueProjectsSeen: data.seenProjects.length,
      currentStreakDays: data.currentStreakDays,
      longestStreakDays: data.longestStreakDays,
    }
  }

  private recordActiveDay(data: SessionStatsData, today: string): void {
    if (data.lastActiveDate === today) return // already recorded today

    data.currentStreakDays =
      data.lastActiveDate !== null && isNextDay(data.lastActiveDate, today)
        ? data.currentStreakDays + 1
        : 1
    data.longestStreakDays = Math.max(data.longestStreakDays, data.currentStreakDays)
    data.lastActiveDate = today
  }
}

/**
 * Backfills fields that a file written by an older version of this tracker
 * won't have — `JsonFileStore`'s `defaultValue` only covers a missing/corrupt
 * file, not a valid-but-outdated one, so a schema addition like
 * `seenProjects` needs an explicit default here or a pre-existing
 * `session-stats.json` would read back as `undefined` for it.
 */
function normalize(data: Partial<SessionStatsData>): SessionStatsData {
  return {
    totalSessionsSeen: data.totalSessionsSeen ?? EMPTY.totalSessionsSeen,
    maxConcurrentSessions: data.maxConcurrentSessions ?? EMPTY.maxConcurrentSessions,
    seenSessionIds: data.seenSessionIds ?? EMPTY.seenSessionIds,
    seenProjects: data.seenProjects ?? EMPTY.seenProjects,
    currentStreakDays: data.currentStreakDays ?? EMPTY.currentStreakDays,
    longestStreakDays: data.longestStreakDays ?? EMPTY.longestStreakDays,
    lastActiveDate: data.lastActiveDate ?? EMPTY.lastActiveDate,
  }
}
