import type { MinionFileSystem } from "../fs/file-system.ts";
import type { MinionProcessRunner } from "../process/process-runner.ts";
import type { MinionClock } from "../time/clock.ts";
import { type SessionInfo } from "./sessions.ts";
/**
 * A source of pets: anything that can answer "who is out there, and are they
 * busy right now?" as a `Map<id, SessionInfo>`. The gateway polls `read()`
 * every tick (~250ms), so implementations must be cheap and synchronous —
 * push-based sources (e.g. the Discord gateway) keep a connection alive from
 * `start()` and serve `read()` out of an internal cache.
 *
 * Each source should namespace its ids (e.g. `discord:<userId>`) so entries
 * from different sources can't collide after merging.
 */
export declare abstract class PetSource {
    abstract read(): Map<string, SessionInfo>;
    /** Begins any long-lived work (connections, watchers). Called once by the gateway's `start()`. */
    start(): void;
    /** Tears down whatever `start()` began. */
    stop(): void;
}
/** The original source: Claude Code session files under `~/.claude/sessions`. */
export declare class ClaudeSessionsPetSource extends PetSource {
    private readonly props;
    constructor(props: {
        fs: MinionFileSystem;
        process: MinionProcessRunner;
        clock: MinionClock;
        sessionsDir: string;
        projectsDir: string;
    });
    read(): Map<string, SessionInfo>;
}
/** Reads every source and merges the results. Sources own distinct id namespaces, so later sources winning a collision is a non-event in practice. */
export declare function mergePetSources(sources: readonly PetSource[]): Map<string, SessionInfo>;
