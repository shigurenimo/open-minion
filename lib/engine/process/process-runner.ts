export type RunOptions = {
  cwd?: string
}

/**
 * Process boundary covering foreground builds, detached background spawns,
 * and liveness checks. Default is NodeMinionProcessRunner (Bun.spawn);
 * MemoryMinionProcessRunner records calls and lets tests stub responses.
 */
export abstract class MinionProcessRunner {
  /** Run a command to completion, inheriting stdio. Resolves to its exit code. */
  abstract runInherit(command: string[], options?: RunOptions): Promise<number>
  /** Spawn a detached background process (keeps running after the parent exits). Returns its pid. */
  abstract spawnDetached(command: string[], options?: RunOptions): number
  abstract kill(pid: number, signal?: string): void
  abstract isAlive(pid: number): boolean
}
