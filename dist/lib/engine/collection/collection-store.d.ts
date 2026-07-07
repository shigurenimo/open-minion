import { z } from "zod";
import type { MinionFileSystem } from "../fs/file-system.ts";
declare const schema: z.ZodObject<{
    achievements: z.ZodCatch<z.ZodRecord<z.ZodString, z.ZodString>>;
    species: z.ZodCatch<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
type CollectionData = z.infer<typeof schema>;
/** Persisted unlock/discovery state backing the `minion dex` view (`~/.minion/collection.json`). */
export declare class MinionCollectionStore {
    private readonly store;
    constructor(props: {
        fs: MinionFileSystem;
        path: string;
    });
    read(): CollectionData;
    /** Records `id` as unlocked if it isn't already. Returns whether this call newly unlocked it, or the write failure. */
    unlockAchievement(id: string, at: Date): boolean | Error;
    /** Records `id` as discovered if it isn't already. Returns whether this call newly discovered it, or the write failure. */
    discoverSpecies(id: string, at: Date): boolean | Error;
}
export {};
