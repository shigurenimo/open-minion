import { type Achievement, DEFAULT_ACHIEVEMENTS } from "@lib/engine/collection/achievements"
import type { MinionCollectionStore } from "@lib/engine/collection/collection-store"
import {
  DEFAULT_MINION_SPECIES,
  type MinionSpecies,
  resolveSpecies,
} from "@lib/engine/collection/species"
import type { StatsSnapshot } from "@lib/engine/stats/stats-snapshot"

export type CollectionEvaluation = {
  species: MinionSpecies
  newlyUnlockedAchievements: Achievement[]
  newlyDiscoveredSpecies: MinionSpecies | null
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

  /** Evaluates `stats` against every achievement/species condition, persisting anything newly earned. */
  evaluate(stats: StatsSnapshot): CollectionEvaluation {
    const species = resolveSpecies(stats, this.species)

    const newlyUnlockedAchievements = this.achievements
      .filter((achievement) => achievement.condition(stats))
      .filter((achievement) => this.store.unlockAchievement(achievement.id, stats.now))

    const newlyDiscoveredSpecies = this.store.discoverSpecies(species.id, stats.now)
      ? species
      : null

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
