import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { JsonFileStore } from "@lib/engine/fs/json-file-store"

describe("JsonFileStore", () => {
  it("returns the default value when no file exists", () => {
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      defaultValue: { n: 0 },
    })
    expect(store.read()).toEqual({ n: 0 })
  })

  it("round-trips a written value", () => {
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      defaultValue: { n: 0 },
    })
    store.write({ n: 5 })
    expect(store.read()).toEqual({ n: 5 })
  })

  it("falls back to the default value when the file is corrupt", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.json": "not json" } })
    const store = new JsonFileStore({ fs, path: "/a.json", defaultValue: { n: 0 } })
    expect(store.read()).toEqual({ n: 0 })
  })

  it("never lets callers mutate the shared default value", () => {
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      defaultValue: { list: [] as number[] },
    })
    const first = store.read()
    first.list.push(1)
    expect(store.read()).toEqual({ list: [] })
  })
})
