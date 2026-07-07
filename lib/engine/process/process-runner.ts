export type RunOptions = {
  cwd?: string
}

/**
 * Process boundary covering foreground builds, detached background spawns,
 * and liveness checks. Default is NodeMinionProcessRunner (Bun.spawn);
 * MemoryMinionProcessRunner records calls and lets tests stub responses.
 *
 * Fallible operations return `T | Error` (e.g. the executable doesn't exist)
 * instead of throwing — implementations must catch their runtime's exceptions
 * at this boundary.
 */
export abstract class MinionProcessRunner {
  /** Run a command to completion, inheriting stdio. Resolves to its exit code. */
  abstract runInherit(command: string[], options?: RunOptions): Promise<number | Error>
  /** Spawn a detached background process (keeps running after the parent exits). Returns its pid. */
  abstract spawnDetached(command: string[], options?: RunOptions): number | Error
  abstract kill(pid: number, signal?: string): void
  abstract isAlive(pid: number): boolean
}
