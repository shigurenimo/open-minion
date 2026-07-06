import { dirname } from "node:path"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"

type Props = {
  fs: MinionFileSystem
  path: string
}

/** Reads/writes the flat string-keyed `config.json` (`minion config get/set/list`). */
export class MinionConfigStore {
  private readonly fs: MinionFileSystem
  private readonly path: string

  constructor(props: Props) {
    this.fs = props.fs
    this.path = props.path
  }

  list(): Record<string, string> {
    if (!this.fs.existsSync(this.path)) return {}
    try {
      return JSON.parse(this.fs.readFileSync(this.path))
    } catch {
      return {}
    }
  }

  get(key: string): string {
    return this.list()[key] ?? ""
  }

  set(key: string, value: string): void {
    const config = this.list()
    config[key] = value
    this.write(config)
  }

  private write(config: Record<string, string>): void {
    this.fs.mkdirSync(dirname(this.path), { recursive: true })
    this.fs.writeFileSync(this.path, JSON.stringify(config, null, 2))
  }
}
