import { createHash } from "node:crypto"
import { join } from "node:path"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"

type Props = {
  fs: MinionFileSystem
  appRoot: string
}

/**
 * Hashes `Package.swift` plus every `.swift` file under `Sources/`, so a release
 * build can be skipped when the source tree hasn't changed since the last build.
 */
export function computeSourceHash(props: Props): string {
  const sourcesRoot = join(props.appRoot, "Sources")

  const files = [
    join(props.appRoot, "Package.swift"),
    ...props.fs
      .readdirRecursiveSync(sourcesRoot)
      .filter((file) => file.endsWith(".swift"))
      .map((file) => join(sourcesRoot, file)),
  ].sort()

  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(props.fs.readFileSync(file))
  }
  return hash.digest("hex")
}
