import { z } from "zod"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

const schema = z.object({
  /** achievement id -> ISO timestamp of when it was unlocked */
  achievements: z.record(z.string(), z.string()).catch({}),
  /** species id -> ISO timestamp of when it was first seen */
  species: z.record(z.string(), z.string()).catch({}),
})

type CollectionData = z.infer<typeof schema>

const EMPTY: CollectionData = { achievements: {}, species: {} }

/** Persisted unlock/discovery state backing the `minion dex` view (`~/.minion/collection.json`). */
export class MinionCollectionStore {
  private readonly store: JsonFileStore<CollectionData>

  constructor(props: { fs: MinionFileSystem; path: string }) {
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, schema, defaultValue: EMPTY })
  }

  read(): CollectionData {
    return this.store.read()
  }

  /** Records `id` as unlocked if it isn't already. Returns whether this call newly unlocked it, or the write failure. */
  unlockAchievement(id: string, at: Date): boolean | Error {
    const data = this.store.read()
    if (data.achievements[id]) return false
    data.achievements[id] = at.toISOString()
    return this.store.write(data) ?? true
  }

  /** Records `id` as discovered if it isn't already. Returns whether this call newly discovered it, or the write failure. */
  discoverSpecies(id: string, at: Date): boolean | Error {
    const data = this.store.read()
    if (data.species[id]) return false
    data.species[id] = at.toISOString()
    return this.store.write(data) ?? true
  }
}
