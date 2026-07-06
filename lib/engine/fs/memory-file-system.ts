import { type MinionFileStat, MinionFileSystem } from "@lib/engine/fs/file-system"

type Props = {
  dirs?: string[]
  files?: Record<string, string>
  mtimes?: Record<string, number>
  /** Clock used to stamp mtimes on write, when a file's mtime isn't set explicitly via `setMtime`. Defaults to `Date.now`. */
  now?: () => number
}

export class MemoryMinionFileSystem extends MinionFileSystem {
  private readonly dirs: Set<string>
  private readonly files: Map<string, string>
  private readonly mtimes: Map<string, number>
  private readonly now: () => number

  constructor(props: Props = {}) {
    super()
    this.dirs = new Set(props.dirs ?? [])
    this.files = new Map(Object.entries(props.files ?? {}))
    this.mtimes = new Map(Object.entries(props.mtimes ?? {}))
    this.now = props.now ?? (() => Date.now())
  }

  existsSync(path: string): boolean {
    return this.dirs.has(path) || this.files.has(path)
  }

  readFileSync(path: string): string {
    const data = this.files.get(path)
    if (data === undefined) throw new Error(`not found: ${path}`)
    return data
  }

  writeFileSync(path: string, data: string): void {
    this.files.set(path, data)
    this.touch(path)
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    void options
    this.dirs.add(path)
  }

  rmSync(path: string, options?: { force?: boolean }): void {
    if (!options?.force && !this.existsSync(path)) {
      throw new Error(`not found: ${path}`)
    }
    this.files.delete(path)
    this.dirs.delete(path)
    this.mtimes.delete(path)
  }

  readdirSync(path: string): string[] {
    const prefix = path.endsWith("/") ? path : `${path}/`
    const names = new Set<string>()

    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue
      const rest = file.slice(prefix.length)
      const [first] = rest.split("/")
      if (first) names.add(first)
    }

    return Array.from(names)
  }

  /** Returns file paths only (no directory entries), unlike node:fs's recursive readdirSync. */
  readdirRecursiveSync(path: string): string[] {
    const prefix = path.endsWith("/") ? path : `${path}/`
    const names: string[] = []

    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue
      names.push(file.slice(prefix.length))
    }

    return names
  }

  createExclusiveSync(path: string): boolean {
    if (this.files.has(path)) return false
    this.files.set(path, "")
    this.touch(path)
    return true
  }

  statSync(path: string): MinionFileStat {
    if (!this.files.has(path)) throw new Error(`not found: ${path}`)
    const mtimeMs = this.mtimes.get(path)
    if (mtimeMs === undefined) this.touch(path)
    return { mtimeMs: this.mtimes.get(path) ?? this.now() }
  }

  /** Sets a file's mtime explicitly — useful for asserting "unchanged since last scan" behavior in tests. */
  setMtime(path: string, mtimeMs: number): void {
    this.mtimes.set(path, mtimeMs)
  }

  private touch(path: string): void {
    this.mtimes.set(path, this.now())
  }
}
