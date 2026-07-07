import type { MinionFileSystem } from "../fs/file-system.ts";
import type { SessionInfo } from "../gateway/sessions.ts";
export type SessionStatsSummary = {
    totalSessionsSeen: number;
    currentConcurrentSessions: number;
    maxConcurrentSessions: number;
    uniqueProjectsSeen: number;
    currentStreakDays: number;
    longestStreakDays: number;
};
/**
 * Tracks lifetime distinct session/project counts, the concurrency
 * high-water-mark, and a day-streak of "was any session active that day",
 * all persisted across gateway restarts.
 */
export declare class SessionStatsTracker {
    private readonly store;
    constructor(props: {
        fs: MinionFileSystem;
        path: string;
    });
    /** Records the latest active-session snapshot (at `now`) and returns the updated summary, or the write failure. */
    record(activeSessions: Map<string, SessionInfo>, now: Date): SessionStatsSummary | Error;
    /** Persisted totals without recording a new sample; `currentConcurrentSessions` is always 0 here since no live sessions were read. */
    summary(): SessionStatsSummary;
    private recordActiveDay;
}
