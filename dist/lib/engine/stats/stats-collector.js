import { readActiveSessions } from "../gateway/sessions.js";
import { timeBucketForHour } from "./stats-snapshot.js";
import { sumRecentDays } from "./date-window.js";
const WEEK_DAYS = 7;
/**
 * Combines session tracking and token-usage scanning into the single
 * `StatsSnapshot` that achievement and minion-species conditions evaluate
 * against.
 */
export class MinionStatsCollector {
    fs;
    process;
    clock;
    sessionsDir;
    projectsDir;
    sessionStats;
    tokenUsage;
    constructor(props) {
        this.fs = props.fs;
        this.process = props.process;
        this.clock = props.clock;
        this.sessionsDir = props.sessionsDir;
        this.projectsDir = props.projectsDir;
        this.sessionStats = props.sessionStats;
        this.tokenUsage = props.tokenUsage;
    }
    /**
     * Reads the current sessions and re-scans token usage, recording both.
     * Touches disk (transcripts can be large) — call this on a slow cadence,
     * not on every animation tick. Returns an Error when persisting either
     * tracker's state fails.
     */
    collect() {
        const activeSessions = readActiveSessions({
            fs: this.fs,
            process: this.process,
            clock: this.clock,
            sessionsDir: this.sessionsDir,
            projectsDir: this.projectsDir,
        });
        const sessionSummary = this.sessionStats.record(activeSessions, this.clock.now());
        if (sessionSummary instanceof Error)
            return sessionSummary;
        const usage = this.tokenUsage.scan();
        if (usage instanceof Error)
            return usage;
        return this.buildSnapshot(sessionSummary, usage);
    }
    /** Cheap read of the last persisted totals, without touching sessions or transcripts. */
    peek() {
        const sessionSummary = this.sessionStats.summary();
        const usage = this.tokenUsage.summary();
        return this.buildSnapshot(sessionSummary, usage);
    }
    buildSnapshot(sessionSummary, usage) {
        const now = this.clock.now();
        const hour = now.getHours();
        // UTC date, matching TokenUsageTracker's transcript-timestamp bucketing.
        const today = now.toISOString().slice(0, 10);
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
        };
    }
}
