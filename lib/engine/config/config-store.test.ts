import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "../fs/memory-file-system"
import { migrateLegacyConfigFile, MinionConfigStore } from "./config-store"

function store(): MinionConfigStore {
  return new MinionConfigStore({ fs: new MemoryMinionFileSystem(), path: "/data/config.json" })
}

describe("MinionConfigStore", () => {
  it("returns an empty object when no config file exists", () => {
    expect(store().list()).toEqual({})
  })

  it("returns undefined for a missing key, distinguishable from an empty value", () => {
    const config = store()
    expect(config.get("greeting")).toBeUndefined()
    config.set("greeting", "")
    expect(config.get("greeting")).toBe("")
  })

  it("round-trips a set value through get", () => {
    const config = store()
    config.set("greeting", "hello")
    expect(config.get("greeting")).toBe("hello")
  })

  it("lists every key that has been set", () => {
    const config = store()
    config.set("a", "1")
    config.set("b", "2")
    expect(config.list()).toEqual({ a: "1", b: "2" })
  })

  it("preserves previously set keys when setting a new one", () => {
    const config = store()
    config.set("a", "1")
    config.set("b", "2")
    expect(config.get("a")).toBe("1")
  })

  it("overwrites an existing key", () => {
    const config = store()
    config.set("a", "1")
    config.set("a", "2")
    expect(config.get("a")).toBe("2")
  })

  it("falls back to an empty object when the config file is corrupt", () => {
    const fs = new MemoryMinionFileSystem({ files: { "/data/config.json": "not json" } })
    const config = new MinionConfigStore({ fs, path: "/data/config.json" })
    expect(config.list()).toEqual({})
  })
})

describe("migrateLegacyConfigFile", () => {
  const FROM = "/home/.minion/config.json"
  const TO = "/home/.config/minion/config.json"

  it("copies the legacy file to the new location, keeping the original", () => {
    const fs = new MemoryMinionFileSystem({ files: { [FROM]: `{"a":"1"}` } })

    expect(migrateLegacyConfigFile({ fs, from: FROM, to: TO })).toBeNull()

    expect(fs.readFileSync(TO)).toBe(`{"a":"1"}`)
    expect(fs.readFileSync(FROM)).toBe(`{"a":"1"}`)
  })

  it("never overwrites an existing file at the new location", () => {
    const fs = new MemoryMinionFileSystem({
      files: { [FROM]: `{"a":"old"}`, [TO]: `{"a":"new"}` },
    })

    expect(migrateLegacyConfigFile({ fs, from: FROM, to: TO })).toBeNull()

    expect(fs.readFileSync(TO)).toBe(`{"a":"new"}`)
  })

  it("does nothing when there is no legacy file", () => {
    const fs = new MemoryMinionFileSystem()

    expect(migrateLegacyConfigFile({ fs, from: FROM, to: TO })).toBeNull()

    expect(fs.existsSync(TO)).toBe(false)
  })

  it("does nothing when both paths are the same", () => {
    const fs = new MemoryMinionFileSystem({ files: { [FROM]: `{"a":"1"}` } })

    expect(migrateLegacyConfigFile({ fs, from: FROM, to: FROM })).toBeNull()

    expect(fs.readFileSync(FROM)).toBe(`{"a":"1"}`)
  })
})
