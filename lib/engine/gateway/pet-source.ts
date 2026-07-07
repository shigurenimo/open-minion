import type { MinionFileSystem } from "../fs/file-system"
import type { MinionProcessRunner } from "../process/process-runner"
import type { MinionClock } from "../time/clock"
import { readActiveSessions, type SessionInfo } from "./sessions"

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
export abstract class PetSource {
  abstract read(): Map<string, SessionInfo>

  /** Begins any long-lived work (connections, watchers). Called once by the gateway's `start()`. */
  start(): void {}

  /** Tears down whatever `start()` began. */
  stop(): void {}
}

/** The original source: Claude Code session files under `~/.claude/sessions`. */
export class ClaudeSessionsPetSource extends PetSource {
  private readonly props: {
    fs: MinionFileSystem
    process: MinionProcessRunner
    clock: MinionClock
    sessionsDir: string
    projectsDir: string
  }

  constructor(props: {
    fs: MinionFileSystem
    process: MinionProcessRunner
    clock: MinionClock
    sessionsDir: string
    projectsDir: string
  }) {
    super()
    this.props = props
  }

  read(): Map<string, SessionInfo> {
    return readActiveSessions(this.props)
  }
}

/** Reads every source and merges the results. Sources own distinct id namespaces, so later sources winning a collision is a non-event in practice. */
export function mergePetSources(sources: readonly PetSource[]): Map<string, SessionInfo> {
  const merged = new Map<string, SessionInfo>()
  for (const source of sources) {
    for (const [id, info] of source.read()) merged.set(id, info)
  }
  return merged
}
