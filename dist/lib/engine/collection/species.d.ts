import type { StatsSnapshot } from "../stats/stats-snapshot.ts";
export type MinionRarity = "common" | "rare";
export type MinionSpecies = {
    id: string;
    name: string;
    rarity: MinionRarity;
    description: string;
    condition: (stats: StatsSnapshot) => boolean;
    /**
     * Opaque reference to this species' art (a sprite path, bundle key, URL —
     * whatever scheme the host app's renderer uses). This library never reads
     * or interprets it; it just carries it through `dex()` for a host to
     * consume. Left `undefined` in the built-in catalog — pass your own
     * catalog (see `MinionCollectionTracker`'s `species` prop) to fill it in.
     */
    asset?: string;
};
/**
 * The built-in minion species catalog. `resolveSpecies` picks the first
 * entry whose condition matches, so order is priority: rare/specific
 * conditions are listed first, and the five time-of-day commons — which
 * together cover every hour — sit last as the guaranteed fallback.
 *
 * This is only the default; pass a custom `species` array to
 * `MinionCollectionTracker` (or `Minion`) to replace it entirely — e.g. to
 * add your own species, retheme the built-ins, or attach real `asset`
 * references once art exists.
 */
export declare const DEFAULT_MINION_SPECIES: MinionSpecies[];
/**
 * The species that manifests right now, per `stats`. Checks `catalog` in
 * order and returns the first match — defaults to `DEFAULT_MINION_SPECIES`,
 * whose time-of-day commons cover every hour so it always resolves. A custom
 * catalog must include an unconditional (or otherwise fully-covering)
 * fallback entry, or this returns an Error when nothing matches.
 */
export declare function resolveSpecies(stats: StatsSnapshot, catalog?: MinionSpecies[]): MinionSpecies | Error;
