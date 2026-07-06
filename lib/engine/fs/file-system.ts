export type MinionFileStat = {
  mtimeMs: number
}

/**
 * Filesystem boundary used everywhere minion reads or writes.
 * Default is NodeMinionFileSystem (real `node:fs`); MemoryMinionFileSystem
 * provides a sandbox for tests and embedded use.
 */
export abstract class MinionFileSystem {
  abstract existsSync(path: string): boolean
  abstract readFileSync(path: string): string
  abstract writeFileSync(path: string, data: string): void
  abstract mkdirSync(path: string, options?: { recursive?: boolean }): void
  abstract rmSync(path: string, options?: { force?: boolean }): void
  abstract readdirSync(path: string): string[]
  /** Recursively list files under `path`, as `/`-joined paths relative to `path`. */
  abstract readdirRecursiveSync(path: string): string[]
  /**
   * Atomically create `path` only if it does not already exist (O_EXCL).
   * Returns `true` if this call created it, `false` if it already existed.
   * Used for the start-lock / pid-file singleton guard.
   */
  abstract createExclusiveSync(path: string): boolean
  /** Used to detect whether a file changed since it was last scanned (e.g. transcript token-usage scanning). */
  abstract statSync(path: string): MinionFileStat
}
