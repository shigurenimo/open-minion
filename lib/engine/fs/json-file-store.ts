import { dirname } from "node:path"
import type { z } from "zod"
import { safeJsonParse } from "../errors.ts"
import type { MinionFileSystem } from "./file-system.ts"

type Props<T> = {
  fs: MinionFileSystem
  path: string
  /**
   * Runtime shape guard for what comes back off disk — `JSON.parse` alone
   * would let a hand-edited or version-skewed file flow through as `T` and
   * crash later. Give evolving schemas per-field `.catch()` defaults so a
   * file written by an older version backfills instead of falling back wholesale.
   */
  schema: z.ZodType<T>
  defaultValue: T
}

/**
 * Reads/writes a single JSON value at `path`, creating parent directories as
 * needed. Falls back to a fresh clone of `defaultValue` when the file is
 * missing, unreadable, corrupt, or fails `schema` validation. Shared by every
 * `~/.minion/*.json` store (config, session stats, token usage, collection)
 * to avoid re-deriving the same read/parse/validate/write boilerplate in each one.
 */
export class JsonFileStore<T> {
  private readonly fs: MinionFileSystem
  private readonly path: string
  private readonly schema: z.ZodType<T>
  private readonly defaultValue: T

  constructor(props: Props<T>) {
    this.fs = props.fs
    this.path = props.path
    this.schema = props.schema
    this.defaultValue = props.defaultValue
  }

  read(): T {
    if (!this.fs.existsSync(this.path)) return structuredClone(this.defaultValue)

    const content = this.fs.readFileSync(this.path)
    if (content instanceof Error) return structuredClone(this.defaultValue)

    const json = safeJsonParse(content)
    if (json instanceof Error) return structuredClone(this.defaultValue)

    const result = this.schema.safeParse(json)
    return result.success ? result.data : structuredClone(this.defaultValue)
  }

  write(value: T): Error | null {
    const mkdirError = this.fs.mkdirSync(dirname(this.path), { recursive: true })
    if (mkdirError) return mkdirError
    return this.fs.writeFileSync(this.path, JSON.stringify(value, null, 2))
  }
}
