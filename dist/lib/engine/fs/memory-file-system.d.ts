import { type MinionFileStat, MinionFileSystem } from "./file-system.ts";
type Props = {
    dirs?: string[];
    files?: Record<string, string>;
    mtimes?: Record<string, number>;
    /** Clock used to stamp mtimes on write, when a file's mtime isn't set explicitly via `setMtime`. Defaults to `Date.now`. */
    now?: () => number;
};
export declare class MemoryMinionFileSystem extends MinionFileSystem {
    private readonly dirs;
    private readonly files;
    private readonly mtimes;
    private readonly now;
    constructor(props?: Props);
    existsSync(path: string): boolean;
    readFileSync(path: string): string | Error;
    writeFileSync(path: string, data: string): Error | null;
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): Error | null;
    rmSync(path: string, options?: {
        force?: boolean;
    }): Error | null;
    readdirSync(path: string): string[] | Error;
    /** Returns file paths only (no directory entries), unlike node:fs's recursive readdirSync. */
    readdirRecursiveSync(path: string): string[] | Error;
    createExclusiveSync(path: string): boolean;
    statSync(path: string): MinionFileStat | Error;
    /** Sets a file's mtime explicitly — useful for asserting "unchanged since last scan" behavior in tests. */
    setMtime(path: string, mtimeMs: number): void;
    private touch;
}
export {};
