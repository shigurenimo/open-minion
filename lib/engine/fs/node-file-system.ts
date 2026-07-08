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
import { toError } from "@/lib/engine/errors.ts"
import { type MinionFileStat, MinionFileSystem } from "@/lib/engine/fs/file-system.ts"

export class NodeMinionFileSystem extends MinionFileSystem {
  existsSync(path: string): boolean {
    return existsSync(path)
  }

  readFileSync(path: string): string | Error {
    try {
      return readFileSync(path, "utf8")
    } catch (thrown) {
      return toError(thrown)
    }
  }

  writeFileSync(path: string, data: string): Error | null {
    try {
      writeFileSync(path, data)
      return null
    } catch (thrown) {
      return toError(thrown)
    }
  }

  mkdirSync(path: string, options?: { recursive?: boolean }): Error | null {
    try {
      mkdirSync(path, { recursive: options?.recursive ?? false })
      return null
    } catch (thrown) {
      return toError(thrown)
    }
  }

  rmSync(path: string, options?: { force?: boolean }): Error | null {
    try {
      rmSync(path, { force: options?.force ?? false })
      return null
    } catch (thrown) {
      return toError(thrown)
    }
  }

  readdirSync(path: string): string[] | Error {
    try {
      return readdirSync(path)
    } catch (thrown) {
      return toError(thrown)
    }
  }

  readdirRecursiveSync(path: string): string[] | Error {
    try {
      return readdirSync(path, { recursive: true, encoding: "utf8" })
    } catch (thrown) {
      return toError(thrown)
    }
  }

  createExclusiveSync(path: string): boolean {
    try {
      closeSync(openSync(path, "wx"))
      return true
    } catch {
      return false
    }
  }

  statSync(path: string): MinionFileStat | Error {
    try {
      return { mtimeMs: statSync(path).mtimeMs }
    } catch (thrown) {
      return toError(thrown)
    }
  }
}
