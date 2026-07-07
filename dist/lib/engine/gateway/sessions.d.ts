import type { MinionFileSystem } from "../fs/file-system.ts";
import type { MinionProcessRunner } from "../process/process-runner.ts";
import type { MinionClock } from "../time/clock.ts";
export type SessionInfo = {
    running: boolean;
    name: string;
    /** The session's working directory, when Claude Code recorded one — used to count distinct projects worked in. */
    cwd?: string;
    /** Set when the subject is doing something more specific than "busy" — e.g. a Discord friend playing a game. */
    activity?: "gaming";
};
type Props = {
    fs: MinionFileSystem;
    process: MinionProcessRunner;
    clock: MinionClock;
    sessionsDir: string;
    /** Claude Code's transcript root (`~/.claude/projects`) — the busy signal for sessions whose file has no `status`. */
    projectsDir: string;
    /** How long a dead session's last-known status is trusted before it's dropped. Defaults to 8 minutes. */
    staleMs?: number;
    /** How recent a transcript write counts as "busy" for statusless sessions. Defaults to 2 minutes. */
    transcriptActiveMs?: number;
};
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
export declare function readActiveSessions(props: Props): Map<string, SessionInfo>;
export {};
