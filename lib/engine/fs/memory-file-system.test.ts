import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "./memory-file-system.ts"

function must<T>(value: T | Error): T {
  if (value instanceof Error) throw value
  return value
}

describe("MemoryMinionFileSystem.statSync", () => {
  it("returns an Error for a file that doesn't exist", () => {
    const fs = new MemoryMinionFileSystem()
    expect(fs.statSync("/nope.txt")).toBeInstanceOf(Error)
  })

  it("stamps an mtime on write using the injected clock", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    fs.writeFileSync("/a.txt", "hello")
    expect(must(fs.statSync("/a.txt")).mtimeMs).toBe(1000)

    now = 2000
    fs.writeFileSync("/a.txt", "updated")
    expect(must(fs.statSync("/a.txt")).mtimeMs).toBe(2000)
  })

  it("lets a test pin a file's mtime directly", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.txt": "hello" } })
    fs.setMtime("/a.txt", 42)
    expect(must(fs.statSync("/a.txt")).mtimeMs).toBe(42)
  })

  it("clears the mtime when the file is removed", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.txt": "hello" } })
    fs.setMtime("/a.txt", 42)
    fs.rmSync("/a.txt", { force: true })
    expect(fs.statSync("/a.txt")).toBeInstanceOf(Error)
  })
})
