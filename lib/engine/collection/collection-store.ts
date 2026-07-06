import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

type CollectionData = {
  /** achievement id -> ISO timestamp of when it was unlocked */
  achievements: Record<string, string>
  /** species id -> ISO timestamp of when it was first seen */
  species: Record<string, string>
}

const EMPTY: CollectionData = { achievements: {}, species: {} }

/** Persisted unlock/discovery state backing the `minion dex` view (`~/.minion/collection.json`). */
export class MinionCollectionStore {
  private readonly store: JsonFileStore<CollectionData>

  constructor(props: { fs: MinionFileSystem; path: string }) {
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, defaultValue: EMPTY })
  }

  read(): CollectionData {
    return this.store.read()
  }

  /** Records `id` as unlocked if it isn't already. Returns whether this call newly unlocked it. */
  unlockAchievement(id: string, at: Date): boolean {
    const data = this.store.read()
    if (data.achievements[id]) return false
    data.achievements[id] = at.toISOString()
    this.store.write(data)
    return true
  }

  /** Records `id` as discovered if it isn't already. Returns whether this call newly discovered it. */
  discoverSpecies(id: string, at: Date): boolean {
    const data = this.store.read()
    if (data.species[id]) return false
    data.species[id] = at.toISOString()
    this.store.write(data)
    return true
  }
}
