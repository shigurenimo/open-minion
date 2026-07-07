import { homedir } from "node:os";
import { join } from "node:path";
export function resolveMinionPaths(props) {
    const dataDir = props.dataDir ?? join(homedir(), ".minion");
    const configDir = props.configDir ?? defaultConfigDir();
    const appRoot = join(props.packageRoot, "swift");
    const buildPath = join(dataDir, "build");
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
    };
}
function defaultConfigDir() {
    const xdg = process.env.XDG_CONFIG_HOME;
    return xdg !== undefined && xdg !== ""
        ? join(xdg, "minion")
        : join(homedir(), ".config", "minion");
}
