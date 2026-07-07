import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import type { MinionProcessRunner } from "@lib/engine/process/process-runner"
import type { MinionClock } from "@lib/engine/time/clock"
import { readActiveSessions } from "@lib/engine/gateway/sessions"
import type { SessionStatsSummary } from "@lib/engine/stats/session-stats-tracker"
import { SessionStatsTracker } from "@lib/engine/stats/session-stats-tracker"
import type { TokenUsageSummary } from "@lib/engine/stats/token-usage-tracker"
import { TokenUsageTracker } from "@lib/engine/stats/token-usage-tracker"
import { type StatsSnapshot, timeBucketForHour } from "@lib/engine/stats/stats-snapshot"
import { sumRecentDays } from "@lib/engine/stats/date-window"

const WEEK_DAYS = 7

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  clock: MinionClock
  sessionsDir: string
  projectsDir: string
  sessionStats: SessionStatsTracker
  tokenUsage: TokenUsageTracker
}

/**
 * Combines session tracking and token-usage scanning into the single
 * `StatsSnapshot` that achievement and minion-species conditions evaluate
 * against.
 */
export class MinionStatsCollector {
  private readonly fs: MinionFileSystem
  private readonly process: MinionProcessRunner
  private readonly clock: MinionClock
  private readonly sessionsDir: string
  private readonly projectsDir: string
  private readonly sessionStats: SessionStatsTracker
  private readonly tokenUsage: TokenUsageTracker

  constructor(props: Props) {
    this.fs = props.fs
    this.process = props.process
    this.clock = props.clock
    this.sessionsDir = props.sessionsDir
    this.projectsDir = props.projectsDir
    this.sessionStats = props.sessionStats
    this.tokenUsage = props.tokenUsage
  }

  /**
   * Reads the current sessions and re-scans token usage, recording both.
   * Touches disk (transcripts can be large) — call this on a slow cadence,
   * not on every animation tick. Returns an Error when persisting either
   * tracker's state fails.
   */
  collect(): StatsSnapshot | Error {
    const activeSessions = readActiveSessions({
      fs: this.fs,
      process: this.process,
      clock: this.clock,
      sessionsDir: this.sessionsDir,
      projectsDir: this.projectsDir,
    })
    const sessionSummary = this.sessionStats.record(activeSessions, this.clock.now())
    if (sessionSummary instanceof Error) return sessionSummary
    const usage = this.tokenUsage.scan()
    if (usage instanceof Error) return usage
    return this.buildSnapshot(sessionSummary, usage)
  }

  /** Cheap read of the last persisted totals, without touching sessions or transcripts. */
  peek(): StatsSnapshot {
    const sessionSummary = this.sessionStats.summary()
    const usage = this.tokenUsage.summary()
    return this.buildSnapshot(sessionSummary, usage)
  }

  private buildSnapshot(
    sessionSummary: SessionStatsSummary,
    usage: TokenUsageSummary,
  ): StatsSnapshot {
    const now = this.clock.now()
    const hour = now.getHours()
    // UTC date, matching TokenUsageTracker's transcript-timestamp bucketing.
    const today = now.toISOString().slice(0, 10)

    return {
      now,
      hour,
      timeBucket: timeBucketForHour(hour),
      currentConcurrentSessions: sessionSummary.currentConcurrentSessions,
      maxConcurrentSessions: sessionSummary.maxConcurrentSessions,
      totalSessionsSeen: sessionSummary.totalSessionsSeen,
      uniqueProjectsSeen: sessionSummary.uniqueProjectsSeen,
      currentStreakDays: sessionSummary.currentStreakDays,
      longestStreakDays: sessionSummary.longestStreakDays,
      tokensTotal: usage.tokensTotal,
      tokensToday: usage.tokensByDate[today] ?? 0,
      tokensThisWeek: sumRecentDays(usage.tokensByDate, today, WEEK_DAYS),
    }
  }
}
