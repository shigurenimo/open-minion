import { dirname } from "node:path"
import { z } from "zod"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

type Props = {
  fs: MinionFileSystem
  path: string
}

/**
 * One-time copy of the pre-0.5 config (`~/.minion/config.json`) to the XDG
 * location (`~/.config/minion/config.json`). The legacy file is left in place
 * so a downgrade keeps working; once the new file exists it always wins.
 */
export function migrateLegacyConfigFile(props: {
  fs: MinionFileSystem
  from: string
  to: string
}): Error | null {
  if (props.from === props.to) return null
  if (props.fs.existsSync(props.to)) return null
  if (!props.fs.existsSync(props.from)) return null

  const content = props.fs.readFileSync(props.from)
  if (content instanceof Error) return content
  const mkdirError = props.fs.mkdirSync(dirname(props.to), { recursive: true })
  if (mkdirError) return mkdirError
  return props.fs.writeFileSync(props.to, content)
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
