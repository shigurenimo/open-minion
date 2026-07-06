import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

type Props = {
  fs: MinionFileSystem
  path: string
}

const EMPTY: Record<string, string> = {}

/** Reads/writes the flat string-keyed `config.json` (`minion config get/set/list`). */
export class MinionConfigStore {
  private readonly store: JsonFileStore<Record<string, string>>

  constructor(props: Props) {
    this.store = new JsonFileStore({ fs: props.fs, path: props.path, defaultValue: EMPTY })
  }

  list(): Record<string, string> {
    return this.store.read()
  }

  get(key: string): string {
    return this.list()[key] ?? ""
  }

  set(key: string, value: string): void {
    const config = this.list()
    config[key] = value
    this.store.write(config)
  }
}
