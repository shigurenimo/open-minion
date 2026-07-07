import type { MinionFileSystem } from "../fs/file-system.ts";
import type { MinionProcessRunner } from "../process/process-runner.ts";
import type { MinionClock } from "../time/clock.ts";
import { SessionStatsTracker } from "./session-stats-tracker.ts";
import { TokenUsageTracker } from "./token-usage-tracker.ts";
import { type StatsSnapshot } from "./stats-snapshot.ts";
type Props = {
    fs: MinionFileSystem;
    process: MinionProcessRunner;
    clock: MinionClock;
    sessionsDir: string;
    projectsDir: string;
    sessionStats: SessionStatsTracker;
    tokenUsage: TokenUsageTracker;
};
/**
 * Combines session tracking and token-usage scanning into the single
 * `StatsSnapshot` that achievement and minion-species conditions evaluate
 * against.
 */
export declare class MinionStatsCollector {
    private readonly fs;
    private readonly process;
    private readonly clock;
    private readonly sessionsDir;
    private readonly projectsDir;
    private readonly sessionStats;
    private readonly tokenUsage;
    constructor(props: Props);
    /**
     * Reads the current sessions and re-scans token usage, recording both.
     * Touches disk (transcripts can be large) — call this on a slow cadence,
     * not on every animation tick. Returns an Error when persisting either
     * tracker's state fails.
     */
    collect(): StatsSnapshot | Error;
    /** Cheap read of the last persisted totals, without touching sessions or transcripts. */
    peek(): StatsSnapshot;
    private buildSnapshot;
}
export {};
