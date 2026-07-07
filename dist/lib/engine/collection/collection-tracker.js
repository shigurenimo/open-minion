import { DEFAULT_ACHIEVEMENTS } from "./achievements.js";
import { DEFAULT_MINION_SPECIES, resolveSpecies } from "./species.js";
/** Resolves the currently-manifesting species, unlocks newly-earned achievements, and renders the `minion dex` view. */
export class MinionCollectionTracker {
    store;
    species;
    achievements;
    constructor(props) {
        this.store = props.store;
        this.species = props.species ?? DEFAULT_MINION_SPECIES;
        this.achievements = props.achievements ?? DEFAULT_ACHIEVEMENTS;
    }
    /**
     * Evaluates `stats` against every achievement/species condition, persisting
     * anything newly earned. Returns an Error when the catalog resolves no
     * species (non-covering custom catalog) or persisting an unlock fails.
     */
    evaluate(stats) {
        const species = resolveSpecies(stats, this.species);
        if (species instanceof Error)
            return species;
        const newlyUnlockedAchievements = [];
        for (const achievement of this.achievements) {
            if (!achievement.condition(stats))
                continue;
            const unlocked = this.store.unlockAchievement(achievement.id, stats.now);
            if (unlocked instanceof Error)
                return unlocked;
            if (unlocked)
                newlyUnlockedAchievements.push(achievement);
        }
        const newlyDiscoveredSpecies = [];
        for (const candidate of this.species) {
            if (!candidate.condition(stats))
                continue;
            const discovered = this.store.discoverSpecies(candidate.id, stats.now);
            if (discovered instanceof Error)
                return discovered;
            if (discovered)
                newlyDiscoveredSpecies.push(candidate);
        }
        return { species, newlyUnlockedAchievements, newlyDiscoveredSpecies };
    }
    /** Catalog + unlock state, for rendering the CLI dex. Undiscovered species keep their id/rarity; the CLI is responsible for hiding name/description. */
    dex() {
        const data = this.store.read();
        const achievements = this.achievements.map((achievement) => ({
            ...achievement,
            unlocked: Boolean(data.achievements[achievement.id]),
            unlockedAt: data.achievements[achievement.id] ?? null,
        }));
        const species = this.species.map((s) => ({
            ...s,
            discovered: Boolean(data.species[s.id]),
            firstSeenAt: data.species[s.id] ?? null,
        }));
        return { achievements, species };
    }
}
