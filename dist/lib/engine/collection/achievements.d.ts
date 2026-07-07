import type { StatsSnapshot } from "../stats/stats-snapshot.ts";
export type Achievement = {
    id: string;
    name: string;
    description: string;
    condition: (stats: StatsSnapshot) => boolean;
    /**
     * Opaque reference to this achievement's badge art. Same contract as
     * `MinionSpecies.asset` — carried through untouched, `undefined` by
     * default. Pass your own catalog (see `MinionCollectionTracker`'s
     * `achievements` prop) to fill it in.
     */
    asset?: string;
};
/**
 * The built-in achievement catalog. Only the default — pass a custom
 * `achievements` array to `MinionCollectionTracker` (or `Minion`) to replace
 * it entirely.
 */
export declare const DEFAULT_ACHIEVEMENTS: Achievement[];
