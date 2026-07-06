import { join } from "node:path"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

type FileScanState = {
  mtimeMs: number
  linesConsumed: number
}

type UsageScanData = {
  tokensTotal: number
  tokensByDate: Record<string, number>
  files: Record<string, FileScanState>
}

const EMPTY: UsageScanData = { tokensTotal: 0, tokensByDate: {}, files: {} }

// Bounds tokensByDate's growth; only the running total needs to survive
// forever, per-day figures beyond ~4 months aren't queried by anything here.
const MAX_TRACKED_DATES = 120

export type TokenUsageSummary = {
  tokensTotal: number
  tokensByDate: Record<string, number>
}

type Props = {
  fs: MinionFileSystem
  path: string
  /** Claude Code's transcript root, e.g. `~/.claude/projects`. */
  projectsDir: string
}

/**
 * Incrementally sums token usage out of Claude Code's transcript files
 * (`<projectsDir>/**\/*.jsonl`, one JSON object per line). Tracks each
 * file's mtime and how many lines were already counted, so a scan only
 * re-reads files that changed since the last scan, and only parses newly
 * appended lines within those — this keeps repeated scans cheap even though
 * the underlying transcripts only grow over time.
 */
export class TokenUsageTracker {
  private readonly fs: MinionFileSystem
  private readonly projectsDir: string
  private readonly store: JsonFileStore<UsageScanData>

  constructor(props: Props) {
    this.fs = props.fs
    this.projectsDir = props.projectsDir
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, defaultValue: EMPTY })
  }

  /** Re-scans changed transcript files and persists the updated totals. Touches disk — call on a slow cadence. */
  scan(): TokenUsageSummary {
    const data = this.store.read()

    let relativeFiles: string[]
    try {
      relativeFiles = this.fs
        .readdirRecursiveSync(this.projectsDir)
        .filter((f) => f.endsWith(".jsonl"))
    } catch {
      return toSummary(data)
    }

    for (const relativeFile of relativeFiles) {
      this.scanFile(join(this.projectsDir, relativeFile), data)
    }

    pruneOldDates(data.tokensByDate)
    this.store.write(data)
    return toSummary(data)
  }

  /** Persisted totals without touching the transcript files. */
  summary(): TokenUsageSummary {
    return toSummary(this.store.read())
  }

  private scanFile(path: string, data: UsageScanData): void {
    let mtimeMs: number
    try {
      mtimeMs = this.fs.statSync(path).mtimeMs
    } catch {
      return
    }

    const known = data.files[path]
    if (known && known.mtimeMs === mtimeMs) return // unchanged since the last scan

    let content: string
    try {
      content = this.fs.readFileSync(path)
    } catch {
      return
    }

    // Filter blank lines (notably the trailing "" from a file that ends in
    // "\n", which every appended JSONL record does) before indexing — a raw
    // split() index would double-count that trailing blank as "consumed" and
    // then permanently skip the next real line once the file grows again.
    const lines = content.split("\n").filter((line) => line.length > 0)
    const startIndex = known?.linesConsumed ?? 0

    for (let i = startIndex; i < lines.length; i++) {
      addLineUsage(lines[i] as string, data)
    }

    data.files[path] = { mtimeMs, linesConsumed: lines.length }
  }
}

function addLineUsage(line: string, data: UsageScanData): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return
  }
  if (typeof parsed !== "object" || parsed === null) return

  const usage = (parsed as { message?: { usage?: Record<string, unknown> } }).message?.usage
  if (!usage || typeof usage !== "object") return

  const tokens =
    numberOr0(usage.input_tokens) +
    numberOr0(usage.output_tokens) +
    numberOr0(usage.cache_creation_input_tokens) +
    numberOr0(usage.cache_read_input_tokens)
  if (tokens <= 0) return

  data.tokensTotal += tokens

  // Bucketed by the transcript line's own (UTC) timestamp date, matching the
  // UTC day boundary MinionStatsCollector uses for "today" — the two must
  // agree, even though it means the day rolls over at UTC midnight rather
  // than the user's local midnight.
  const timestamp = (parsed as { timestamp?: unknown }).timestamp
  const date = typeof timestamp === "string" ? timestamp.slice(0, 10) : undefined
  if (date) data.tokensByDate[date] = (data.tokensByDate[date] ?? 0) + tokens
}

function numberOr0(value: unknown): number {
  return typeof value === "number" ? value : 0
}

function pruneOldDates(tokensByDate: Record<string, number>): void {
  const dates = Object.keys(tokensByDate).sort()
  const excess = dates.length - MAX_TRACKED_DATES
  for (let i = 0; i < excess; i++) {
    const date = dates[i]
    if (date) delete tokensByDate[date]
  }
}

function toSummary(data: UsageScanData): TokenUsageSummary {
  return { tokensTotal: data.tokensTotal, tokensByDate: { ...data.tokensByDate } }
}
