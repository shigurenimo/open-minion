import { z } from "zod"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

type Props = {
  fs: MinionFileSystem
  path: string
}

const schema = z.record(z.string(), z.string())

const EMPTY: Record<string, string> = {}

/** Reads/writes the flat string-keyed `config.json` (`minion config get/set/list`). */
export class MinionConfigStore {
  private readonly store: JsonFileStore<Record<string, string>>

  constructor(props: Props) {
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, schema, defaultValue: EMPTY })
  }

  list(): Record<string, string> {
    return this.store.read()
  }

  /** Returns `undefined` when the key is unset — distinguishable from an empty-string value. */
  get(key: string): string | undefined {
    return this.list()[key]
  }

  set(key: string, value: string): Error | null {
    const config = this.list()
    config[key] = value
    return this.store.write(config)
  }
}
