import { dirname } from "node:path"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"

type Props<T> = {
  fs: MinionFileSystem
  path: string
  defaultValue: T
}

/**
 * Reads/writes a single JSON value at `path`, creating parent directories as
 * needed. Falls back to a fresh clone of `defaultValue` when the file is
 * missing or corrupt. Shared by every `~/.minion/*.json` store (config,
 * session stats, token usage, collection) to avoid re-deriving the same
 * read/parse/write boilerplate in each one.
 */
export class JsonFileStore<T> {
  private readonly fs: MinionFileSystem
  private readonly path: string
  private readonly defaultValue: T

  constructor(props: Props<T>) {
    this.fs = props.fs
    this.path = props.path
    this.defaultValue = props.defaultValue
  }

  read(): T {
    if (!this.fs.existsSync(this.path)) return structuredClone(this.defaultValue)
    try {
      return JSON.parse(this.fs.readFileSync(this.path))
    } catch {
      return structuredClone(this.defaultValue)
    }
  }

  write(value: T): void {
    this.fs.mkdirSync(dirname(this.path), { recursive: true })
    this.fs.writeFileSync(this.path, JSON.stringify(value, null, 2))
  }
}
