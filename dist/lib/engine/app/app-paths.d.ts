export type MinionPaths = {
    /** `~/.minion` by default — runtime state (pids, build output, stats) lives here independent of where the package itself is installed. */
    dataDir: string;
    /** `$XDG_CONFIG_HOME/minion` (default `~/.config/minion`) — user-editable config lives here, separate from runtime state. */
    configDir: string;
    /** The `swift/` directory containing the Xcode Swift Package. */
    appRoot: string;
    buildPath: string;
    binPath: string;
    debugBinPath: string;
    dataFile: string;
    pidFile: string;
    gatewayPidFile: string;
    configFile: string;
    /** Pre-0.5 config location (`<dataDir>/config.json`). Read once to migrate, never written. */
    legacyConfigFile: string;
    sessionStatsFile: string;
    usageScanFile: string;
    collectionFile: string;
};
type Props = {
    /** The directory containing `swift/` (the package root). */
    packageRoot: string;
    dataDir?: string;
    configDir?: string;
};
export declare function resolveMinionPaths(props: Props): MinionPaths;
export {};
