import { describe, expect, it } from "vitest"
import { z } from "zod"
import { MemoryMinionFileSystem } from "@/lib/engine/fs/memory-file-system.ts"
import { JsonFileStore } from "@/lib/engine/fs/json-file-store.ts"

const numberBox = z.object({ n: z.number() })

describe("JsonFileStore", () => {
  it("returns the default value when no file exists", () => {
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      schema: numberBox,
      defaultValue: { n: 0 },
    })
    expect(store.read()).toEqual({ n: 0 })
  })

  it("round-trips a written value", () => {
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      schema: numberBox,
      defaultValue: { n: 0 },
    })
    expect(store.write({ n: 5 })).toBeNull()
    expect(store.read()).toEqual({ n: 5 })
  })

  it("falls back to the default value when the file is corrupt", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.json": "not json" } })
    const store = new JsonFileStore({
      fs,
      path: "/a.json",
      schema: numberBox,
      defaultValue: { n: 0 },
    })
    expect(store.read()).toEqual({ n: 0 })
  })

  it("falls back to the default value when the file is valid JSON but the wrong shape", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/a.json": JSON.stringify({ n: "five" }) } })
    const store = new JsonFileStore({
      fs,
      path: "/a.json",
      schema: numberBox,
      defaultValue: { n: 0 },
    })
    expect(store.read()).toEqual({ n: 0 })
  })

  it("backfills individual fields via per-field catch defaults", () => {
    const schema = z.object({
      n: z.number().catch(0),
      label: z.string().catch("unset"),
    })
    const fs = new MemoryMinionFileSystem({ files: { "/a.json": JSON.stringify({ n: 5 }) } })
    const store = new JsonFileStore({
      fs,
      path: "/a.json",
      schema,
      defaultValue: { n: 0, label: "unset" },
    })
    expect(store.read()).toEqual({ n: 5, label: "unset" })
  })

  it("never lets callers mutate the shared default value", () => {
    const emptyList: number[] = []
    const store = new JsonFileStore({
      fs: new MemoryMinionFileSystem(),
      path: "/a.json",
      schema: z.object({ list: z.array(z.number()) }),
      defaultValue: { list: emptyList },
    })
    const first = store.read()
    first.list.push(1)
    expect(store.read()).toEqual({ list: [] })
  })
})
