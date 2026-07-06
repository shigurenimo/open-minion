import { MinionFileSystem } from "@lib/engine/fs/file-system"

type Props = {
  dirs?: string[]
  files?: Record<string, string>
}

export class MemoryMinionFileSystem extends MinionFileSystem {
  private readonly dirs: Set<string>
  private readonly files: Map<string, string>

  constructor(props: Props = {}) {
    super()
    this.dirs = new Set(props.dirs ?? [])
    this.files = new Map(Object.entries(props.files ?? {}))
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
    return true
  }
}
