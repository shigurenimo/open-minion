import { homedir } from "node:os"
import { join } from "node:path"

export type MinionPaths = {
  /** `~/.minion` by default — state lives here independent of where the package itself is installed. */
  dataDir: string
  /** The `swift/` directory containing the Xcode Swift Package. */
  appRoot: string
  buildPath: string
  binPath: string
  debugBinPath: string
  dataFile: string
  pidFile: string
  gatewayPidFile: string
  configFile: string
  sessionStatsFile: string
  usageScanFile: string
  collectionFile: string
}

type Props = {
  /** The directory containing `swift/` (the package root). */
  packageRoot: string
  dataDir?: string
}

export function resolveMinionPaths(props: Props): MinionPaths {
  const dataDir = props.dataDir ?? join(homedir(), ".minion")
  const appRoot = join(props.packageRoot, "swift")
  const buildPath = join(dataDir, "build")

  return {
    dataDir,
    appRoot,
    buildPath,
    binPath: join(buildPath, "release", "open-minion"),
    debugBinPath: join(buildPath, "debug", "open-minion"),
    dataFile: join(dataDir, "data.json"),
    pidFile: join(dataDir, "pid"),
    gatewayPidFile: join(dataDir, "gateway.pid"),
    configFile: join(dataDir, "config.json"),
    sessionStatsFile: join(dataDir, "session-stats.json"),
    usageScanFile: join(dataDir, "usage-scan.json"),
    collectionFile: join(dataDir, "collection.json"),
  }
}
