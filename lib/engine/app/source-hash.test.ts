import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "../fs/memory-file-system"
import { computeSourceHash } from "./source-hash"

function fsWith(files: Record<string, string>): MemoryMinionFileSystem {
  return new MemoryMinionFileSystem({ files })
}

describe("computeSourceHash", () => {
  it("is stable across calls given the same sources", () => {
    const fs = fsWith({
      "/app/Package.swift": "// package",
      "/app/Sources/open-minion/main.swift": "print(1)",
    })
    const a = computeSourceHash({ fs, appRoot: "/app" })
    const b = computeSourceHash({ fs, appRoot: "/app" })
    expect(a).toBe(b)
  })

  it("changes when a swift file's contents change", () => {
    const before = computeSourceHash({
      fs: fsWith({
        "/app/Package.swift": "// package",
        "/app/Sources/open-minion/main.swift": "print(1)",
      }),
      appRoot: "/app",
    })
    const after = computeSourceHash({
      fs: fsWith({
        "/app/Package.swift": "// package",
        "/app/Sources/open-minion/main.swift": "print(2)",
      }),
      appRoot: "/app",
    })
    expect(after).not.toBe(before)
  })

  it("ignores non-swift files under Sources", () => {
    const withoutAsset = computeSourceHash({
      fs: fsWith({
        "/app/Package.swift": "// package",
        "/app/Sources/open-minion/main.swift": "print(1)",
      }),
      appRoot: "/app",
    })
    const withAsset = computeSourceHash({
      fs: fsWith({
        "/app/Package.swift": "// package",
        "/app/Sources/open-minion/main.swift": "print(1)",
        "/app/Sources/open-minion/Resources/icon.png": "binary",
      }),
      appRoot: "/app",
    })
    expect(withAsset).toBe(withoutAsset)
  })

  it("is independent of file enumeration order", () => {
    const a = computeSourceHash({
      fs: fsWith({
        "/app/Package.swift": "// package",
        "/app/Sources/a.swift": "print(1)",
        "/app/Sources/b.swift": "print(2)",
      }),
      appRoot: "/app",
    })
    const b = computeSourceHash({
      fs: fsWith({
        "/app/Sources/b.swift": "print(2)",
        "/app/Package.swift": "// package",
        "/app/Sources/a.swift": "print(1)",
      }),
      appRoot: "/app",
    })
    expect(a).toBe(b)
  })
})
