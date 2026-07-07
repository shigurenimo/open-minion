import { type Achievement } from "./achievements.ts";
import type { MinionCollectionStore } from "./collection-store.ts";
import { type MinionSpecies } from "./species.ts";
import type { StatsSnapshot } from "../stats/stats-snapshot.ts";
export type CollectionEvaluation = {
    /** The one species manifesting right now — the first (= highest-priority) catalog match. */
    species: MinionSpecies;
    newlyUnlockedAchievements: Achievement[];
    /**
     * Every species whose condition holds right now and wasn't discovered
     * before — not just the manifesting one. A permanently-true high-priority
     * species (e.g. a lifetime-token rare) would otherwise mask everything
     * below it forever and make completing the dex impossible.
     */
    newlyDiscoveredSpecies: MinionSpecies[];
};
export type AchievementDexEntry = Achievement & {
    unlocked: boolean;
    unlockedAt: string | null;
};
export type SpeciesDexEntry = MinionSpecies & {
    discovered: boolean;
    firstSeenAt: string | null;
};
export type CollectionDex = {
    achievements: AchievementDexEntry[];
    species: SpeciesDexEntry[];
};
type Props = {
    store: MinionCollectionStore;
    /** Species catalog to evaluate/resolve against. Defaults to `DEFAULT_MINION_SPECIES` — pass your own to add species, retheme the built-ins, or attach real `asset` references. */
    species?: MinionSpecies[];
    /** Achievement catalog to evaluate against. Defaults to `DEFAULT_ACHIEVEMENTS` — pass your own to replace it entirely. */
    achievements?: Achievement[];
};
/** Resolves the currently-manifesting species, unlocks newly-earned achievements, and renders the `minion dex` view. */
export declare class MinionCollectionTracker {
    private readonly store;
    private readonly species;
    private readonly achievements;
    constructor(props: Props);
    /**
     * Evaluates `stats` against every achievement/species condition, persisting
     * anything newly earned. Returns an Error when the catalog resolves no
     * species (non-covering custom catalog) or persisting an unlock fails.
     */
    evaluate(stats: StatsSnapshot): CollectionEvaluation | Error;
    /** Catalog + unlock state, for rendering the CLI dex. Undiscovered species keep their id/rarity; the CLI is responsible for hiding name/description. */
    dex(): CollectionDex;
}
export {};
