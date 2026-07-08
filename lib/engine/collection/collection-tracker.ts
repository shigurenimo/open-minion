import { type Achievement, DEFAULT_ACHIEVEMENTS } from "@/lib/engine/collection/achievements.ts"
import type { MinionCollectionStore } from "@/lib/engine/collection/collection-store.ts"
import {
  DEFAULT_MINION_SPECIES,
  type MinionSpecies,
  resolveSpecies,
} from "@/lib/engine/collection/species.ts"
import type { StatsSnapshot } from "@/lib/engine/stats/stats-snapshot.ts"

export type CollectionEvaluation = {
  /** The one species manifesting right now — the first (= highest-priority) catalog match. */
  species: MinionSpecies
  newlyUnlockedAchievements: Achievement[]
  /**
   * Every species whose condition holds right now and wasn't discovered
   * before — not just the manifesting one. A permanently-true high-priority
   * species (e.g. a lifetime-token rare) would otherwise mask everything
   * below it forever and make completing the dex impossible.
   */
  newlyDiscoveredSpecies: MinionSpecies[]
}

export type AchievementDexEntry = Achievement & { unlocked: boolean; unlockedAt: string | null }
export type SpeciesDexEntry = MinionSpecies & { discovered: boolean; firstSeenAt: string | null }

export type CollectionDex = {
  achievements: AchievementDexEntry[]
  species: SpeciesDexEntry[]
}

type Props = {
  store: MinionCollectionStore
  /** Species catalog to evaluate/resolve against. Defaults to `DEFAULT_MINION_SPECIES` — pass your own to add species, retheme the built-ins, or attach real `asset` references. */
  species?: MinionSpecies[]
  /** Achievement catalog to evaluate against. Defaults to `DEFAULT_ACHIEVEMENTS` — pass your own to replace it entirely. */
  achievements?: Achievement[]
}

/** Resolves the currently-manifesting species, unlocks newly-earned achievements, and renders the `minion dex` view. */
export class MinionCollectionTracker {
  private readonly store: MinionCollectionStore
  private readonly species: MinionSpecies[]
  private readonly achievements: Achievement[]

  constructor(props: Props) {
    this.store = props.store
    this.species = props.species ?? DEFAULT_MINION_SPECIES
    this.achievements = props.achievements ?? DEFAULT_ACHIEVEMENTS
  }

  /**
   * Evaluates `stats` against every achievement/species condition, persisting
   * anything newly earned. Returns an Error when the catalog resolves no
   * species (non-covering custom catalog) or persisting an unlock fails.
   */
  evaluate(stats: StatsSnapshot): CollectionEvaluation | Error {
    const species = resolveSpecies(stats, this.species)
    if (species instanceof Error) return species

    const newlyUnlockedAchievements: Achievement[] = []
    for (const achievement of this.achievements) {
      if (!achievement.condition(stats)) continue
      const unlocked = this.store.unlockAchievement(achievement.id, stats.now)
      if (unlocked instanceof Error) return unlocked
      if (unlocked) newlyUnlockedAchievements.push(achievement)
    }

    const newlyDiscoveredSpecies: MinionSpecies[] = []
    for (const candidate of this.species) {
      if (!candidate.condition(stats)) continue
      const discovered = this.store.discoverSpecies(candidate.id, stats.now)
      if (discovered instanceof Error) return discovered
      if (discovered) newlyDiscoveredSpecies.push(candidate)
    }

    return { species, newlyUnlockedAchievements, newlyDiscoveredSpecies }
  }

  /** Catalog + unlock state, for rendering the CLI dex. Undiscovered species keep their id/rarity; the CLI is responsible for hiding name/description. */
  dex(): CollectionDex {
    const data = this.store.read()

    const achievements = this.achievements.map((achievement) => ({
      ...achievement,
      unlocked: Boolean(data.achievements[achievement.id]),
      unlockedAt: data.achievements[achievement.id] ?? null,
    }))

    const species = this.species.map((s) => ({
      ...s,
      discovered: Boolean(data.species[s.id]),
      firstSeenAt: data.species[s.id] ?? null,
    }))

    return { achievements, species }
  }
}
