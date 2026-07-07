import type { MinionFileSystem } from "../fs/file-system.ts";
import type { MinionClock } from "../time/clock.ts";
export type TokenUsageSummary = {
    tokensTotal: number;
    tokensByDate: Record<string, number>;
};
type Props = {
    fs: MinionFileSystem;
    clock: MinionClock;
    path: string;
    /** Claude Code's transcript root, e.g. `~/.claude/projects`. */
    projectsDir: string;
};
/**
 * Incrementally sums token usage out of Claude Code's transcript files
 * (`<projectsDir>/**\/*.jsonl`, one JSON object per line). Tracks each
 * file's mtime and how many lines were already counted, so a scan only
 * re-reads files that changed since the last scan, and only parses newly
 * appended lines within those — this keeps repeated scans cheap even though
 * the underlying transcripts only grow over time.
 */
export declare class TokenUsageTracker {
    private readonly fs;
    private readonly clock;
    private readonly projectsDir;
    private readonly store;
    constructor(props: Props);
    /**
     * Re-scans changed transcript files and persists the updated totals.
     * Touches disk — call on a slow cadence. An unreadable transcript dir/file
     * is skipped (transcripts come and go); only a failure to persist the
     * scan state itself returns an Error.
     */
    scan(): TokenUsageSummary | Error;
    /** Persisted totals without touching the transcript files. */
    summary(): TokenUsageSummary;
    private scanFile;
}
export {};
