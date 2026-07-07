export type MinionFileStat = {
    mtimeMs: number;
};
/**
 * Filesystem boundary used everywhere minion reads or writes.
 * Default is NodeMinionFileSystem (real `node:fs`); MemoryMinionFileSystem
 * provides a sandbox for tests and embedded use.
 *
 * Fallible operations return `T | Error` (checked with `instanceof Error`)
 * instead of throwing — implementations must catch their runtime's exceptions
 * at this boundary.
 */
export declare abstract class MinionFileSystem {
    abstract existsSync(path: string): boolean;
    abstract readFileSync(path: string): string | Error;
    abstract writeFileSync(path: string, data: string): Error | null;
    abstract mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): Error | null;
    abstract rmSync(path: string, options?: {
        force?: boolean;
    }): Error | null;
    abstract readdirSync(path: string): string[] | Error;
    /** Recursively list files under `path`, as `/`-joined paths relative to `path`. */
    abstract readdirRecursiveSync(path: string): string[] | Error;
    /**
     * Atomically create `path` only if it does not already exist (O_EXCL).
     * Returns `true` if this call created it, `false` if it already existed.
     * Used for the start-lock / pid-file singleton guard.
     */
    abstract createExclusiveSync(path: string): boolean;
    /** Used to detect whether a file changed since it was last scanned (e.g. transcript token-usage scanning). */
    abstract statSync(path: string): MinionFileStat | Error;
}
