import type { z } from "zod";
import type { MinionFileSystem } from "./file-system.ts";
type Props<T> = {
    fs: MinionFileSystem;
    path: string;
    /**
     * Runtime shape guard for what comes back off disk — `JSON.parse` alone
     * would let a hand-edited or version-skewed file flow through as `T` and
     * crash later. Give evolving schemas per-field `.catch()` defaults so a
     * file written by an older version backfills instead of falling back wholesale.
     */
    schema: z.ZodType<T>;
    defaultValue: T;
};
/**
 * Reads/writes a single JSON value at `path`, creating parent directories as
 * needed. Falls back to a fresh clone of `defaultValue` when the file is
 * missing, unreadable, corrupt, or fails `schema` validation. Shared by every
 * `~/.minion/*.json` store (config, session stats, token usage, collection)
 * to avoid re-deriving the same read/parse/validate/write boilerplate in each one.
 */
export declare class JsonFileStore<T> {
    private readonly fs;
    private readonly path;
    private readonly schema;
    private readonly defaultValue;
    constructor(props: Props<T>);
    read(): T;
    write(value: T): Error | null;
}
export {};
