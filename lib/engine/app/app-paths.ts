import { homedir } from "node:os"
import { join } from "node:path"

export type MinionPaths = {
  /** `~/.minion` by default — runtime state (pids, build output, stats) lives here independent of where the package itself is installed. */
  dataDir: string
  /** `$XDG_CONFIG_HOME/minion` (default `~/.config/minion`) — user-editable config lives here, separate from runtime state. */
  configDir: string
  /** The `swift/` directory containing the Xcode Swift Package. */
  appRoot: string
  buildPath: string
  binPath: string
  debugBinPath: string
  dataFile: string
  pidFile: string
  gatewayPidFile: string
  configFile: string
  /** Pre-0.5 config location (`<dataDir>/config.json`). Read once to migrate, never written. */
  legacyConfigFile: string
  sessionStatsFile: string
  usageScanFile: string
  collectionFile: string
}

type Props = {
  /** The directory containing `swift/` (the package root). */
  packageRoot: string
  dataDir?: string
  configDir?: string
}

export function resolveMinionPaths(props: Props): MinionPaths {
  const dataDir = props.dataDir ?? join(homedir(), ".minion")
  const configDir = props.configDir ?? defaultConfigDir()
  const appRoot = join(props.packageRoot, "swift")
  const buildPath = join(dataDir, "build")

  return {
    dataDir,
    configDir,
    appRoot,
    buildPath,
    binPath: join(buildPath, "release", "open-minion"),
    debugBinPath: join(buildPath, "debug", "open-minion"),
    dataFile: join(dataDir, "data.json"),
    pidFile: join(dataDir, "pid"),
    gatewayPidFile: join(dataDir, "gateway.pid"),
    configFile: join(configDir, "config.json"),
    legacyConfigFile: join(dataDir, "config.json"),
    sessionStatsFile: join(dataDir, "session-stats.json"),
    usageScanFile: join(dataDir, "usage-scan.json"),
    collectionFile: join(dataDir, "collection.json"),
  }
}

function defaultConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  return xdg !== undefined && xdg !== ""
    ? join(xdg, "minion")
    : join(homedir(), ".config", "minion")
}
