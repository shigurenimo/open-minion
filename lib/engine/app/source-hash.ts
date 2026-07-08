import { createHash } from "node:crypto"
import { join } from "node:path"
import type { MinionFileSystem } from "@/lib/engine/fs/file-system.ts"

type Props = {
  fs: MinionFileSystem
  appRoot: string
}

/**
 * Hashes `Package.swift` plus every `.swift` file under `Sources/`, so a release
 * build can be skipped when the source tree hasn't changed since the last build.
 * Returns an Error when the tree can't be read — callers treat that as "hash
 * unknown", i.e. rebuild.
 */
export function computeSourceHash(props: Props): string | Error {
  const sourcesRoot = join(props.appRoot, "Sources")

  const entries = props.fs.readdirRecursiveSync(sourcesRoot)
  if (entries instanceof Error) return entries

  const files = [
    join(props.appRoot, "Package.swift"),
    ...entries.filter((file) => file.endsWith(".swift")).map((file) => join(sourcesRoot, file)),
  ].sort()

  const hash = createHash("sha256")
  for (const file of files) {
    const content = props.fs.readFileSync(file)
    if (content instanceof Error) return content
    hash.update(content)
  }
  return hash.digest("hex")
}
