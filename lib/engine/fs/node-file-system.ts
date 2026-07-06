import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { type MinionFileStat, MinionFileSystem } from "@lib/engine/fs/file-system"

export class NodeMinionFileSystem extends MinionFileSystem {
  existsSync(path: string): boolean {
    return existsSync(path)
  }

  readFileSync(path: string): string {
    return readFileSync(path, "utf8")
  }

  writeFileSync(path: string, data: string): void {
    writeFileSync(path, data)
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, { recursive: options?.recursive ?? false })
  }

  rmSync(path: string, options?: { force?: boolean }): void {
    rmSync(path, { force: options?.force ?? false })
  }

  readdirSync(path: string): string[] {
    return readdirSync(path)
  }

  readdirRecursiveSync(path: string): string[] {
    return readdirSync(path, { recursive: true }) as string[]
  }

  createExclusiveSync(path: string): boolean {
    try {
      closeSync(openSync(path, "wx"))
      return true
    } catch {
      return false
    }
  }

  statSync(path: string): MinionFileStat {
    return { mtimeMs: statSync(path).mtimeMs }
  }
}
