import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"

describe("MemoryMinionFileSystem.statSync", () => {
  it("throws for a file that doesn't exist", () => {
    const fs = new MemoryMinionFileSystem()
    expect(() => fs.statSync("/nope.txt")).toThrow()
  })

  it("stamps an mtime on write using the injected clock", () => {
    let now = 1000
    const fs = new MemoryMinionFileSystem({ now: () => now })
    fs.writeFileSync("/a.txt", "hello")
    expect(fs.statSync("/a.txt").mtimeMs).toBe(1000)

    now = 2000
    fs.writeFileSync("/a.txt", "updated")
    expect(fs.statSync("/a.txt").mtimeMs).toBe(2000)
  })

  it("lets a test pin a file's mtime directly", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.txt": "hello" } })
    fs.setMtime("/a.txt", 42)
    expect(fs.statSync("/a.txt").mtimeMs).toBe(42)
  })

  it("clears the mtime when the file is removed", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.txt": "hello" } })
    fs.setMtime("/a.txt", 42)
    fs.rmSync("/a.txt", { force: true })
    expect(() => fs.statSync("/a.txt")).toThrow()
  })
})
