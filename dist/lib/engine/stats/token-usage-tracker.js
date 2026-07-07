import { join } from "node:path";
import { z } from "zod";
import { safeJsonParse } from "../errors.js";
import { JsonFileStore } from "../fs/json-file-store.js";
const scanDataSchema = z.object({
    tokensTotal: z.number().catch(0),
    tokensByDate: z.record(z.string(), z.number()).catch({}),
    files: z
        .record(z.string(), z.object({ mtimeMs: z.number(), linesConsumed: z.number() }))
        .catch({}),
});
const EMPTY = { tokensTotal: 0, tokensByDate: {}, files: {} };
// Bounds tokensByDate's growth; only the running total needs to survive
// forever, per-day figures beyond ~4 months aren't queried by anything here.
const MAX_TRACKED_DATES = 120;
// Backfill cutoff: an unseen transcript whose mtime is older than this is
// skipped without being read. The rolling figures (today / this week) only
// need the trailing 7 days, so the first-ever scan parses the active week
// instead of the full history — lifetime totals just accrue from that point
// on. Must stay >= the WEEK_DAYS window in stats-collector.ts. A dormant
// file that gets appended later turns recent again and is then counted whole,
// history included — a harmless one-time bump.
const BACKFILL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Incrementally sums token usage out of Claude Code's transcript files
 * (`<projectsDir>/**\/*.jsonl`, one JSON object per line). Tracks each
 * file's mtime and how many lines were already counted, so a scan only
 * re-reads files that changed since the last scan, and only parses newly
 * appended lines within those — this keeps repeated scans cheap even though
 * the underlying transcripts only grow over time.
 */
export class TokenUsageTracker {
    fs;
    clock;
    projectsDir;
    store;
    constructor(props) {
        this.fs = props.fs;
        this.clock = props.clock;
        this.projectsDir = props.projectsDir;
        this.store = new JsonFileStore({
            fs: props.fs,
            path: props.path,
            schema: scanDataSchema,
            defaultValue: EMPTY,
        });
    }
    /**
     * Re-scans changed transcript files and persists the updated totals.
     * Touches disk — call on a slow cadence. An unreadable transcript dir/file
     * is skipped (transcripts come and go); only a failure to persist the
     * scan state itself returns an Error.
     */
    scan() {
        const data = this.store.read();
        const entries = this.fs.readdirRecursiveSync(this.projectsDir);
        if (entries instanceof Error)
            return toSummary(data);
        for (const relativeFile of entries.filter((f) => f.endsWith(".jsonl"))) {
            this.scanFile(join(this.projectsDir, relativeFile), data);
        }
        pruneOldDates(data.tokensByDate);
        const writeError = this.store.write(data);
        if (writeError)
            return writeError;
        return toSummary(data);
    }
    /** Persisted totals without touching the transcript files. */
    summary() {
        return toSummary(this.store.read());
    }
    scanFile(path, data) {
        const stat = this.fs.statSync(path);
        if (stat instanceof Error)
            return;
        const known = data.files[path];
        if (known && known.mtimeMs === stat.mtimeMs)
            return; // unchanged since the last scan
        if (!known && this.clock.millis() - stat.mtimeMs > BACKFILL_WINDOW_MS)
            return; // old history — not worth reading
        const content = this.fs.readFileSync(path);
        if (content instanceof Error)
            return;
        // Filter blank lines (notably the trailing "" from a file that ends in
        // "\n", which every appended JSONL record does) before indexing — a raw
        // split() index would double-count that trailing blank as "consumed" and
        // then permanently skip the next real line once the file grows again.
        const lines = content.split("\n").filter((line) => line.length > 0);
        const startIndex = known?.linesConsumed ?? 0;
        for (let i = startIndex; i < lines.length; i++) {
            addLineUsage(lines[i], data);
        }
        data.files[path] = { mtimeMs: stat.mtimeMs, linesConsumed: lines.length };
    }
}
// Hand-rolled shape checks, not zod: this runs per transcript line, and a
// first-ever scan chews through hundreds of thousands of lines — zod here
// roughly doubles the post-JSON.parse cost for no safety gain over these
// typeof guards (a wrong-shaped line just contributes 0 tokens either way).
function addLineUsage(line, data) {
    const parsed = safeJsonParse(line);
    if (parsed instanceof Error)
        return;
    if (typeof parsed !== "object" || parsed === null)
        return;
    const usage = parsed.message?.usage;
    if (!usage || typeof usage !== "object")
        return;
    const tokens = numberOr0(usage.input_tokens) +
        numberOr0(usage.output_tokens) +
        numberOr0(usage.cache_creation_input_tokens) +
        numberOr0(usage.cache_read_input_tokens);
    if (tokens <= 0)
        return;
    data.tokensTotal += tokens;
    // Bucketed by the transcript line's own (UTC) timestamp date, matching the
    // UTC day boundary MinionStatsCollector uses for "today" — the two must
    // agree, even though it means the day rolls over at UTC midnight rather
    // than the user's local midnight.
    const timestamp = parsed.timestamp;
    const date = typeof timestamp === "string" ? timestamp.slice(0, 10) : undefined;
    if (date)
        data.tokensByDate[date] = (data.tokensByDate[date] ?? 0) + tokens;
}
function numberOr0(value) {
    return typeof value === "number" ? value : 0;
}
function pruneOldDates(tokensByDate) {
    const dates = Object.keys(tokensByDate).sort();
    const excess = dates.length - MAX_TRACKED_DATES;
    for (let i = 0; i < excess; i++) {
        const date = dates[i];
        if (date)
            delete tokensByDate[date];
    }
}
function toSummary(data) {
    return { tokensTotal: data.tokensTotal, tokensByDate: { ...data.tokensByDate } };
}
