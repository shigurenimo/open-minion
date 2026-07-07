import type { MinionFileSystem } from "../fs/file-system.ts";
import type { MinionProcessRunner } from "../process/process-runner.ts";
import type { MinionPaths } from "./app-paths.ts";
export type MinionBuildKind = "debug" | "release";
/** Progress notification emitted while `start()` runs. Presentation belongs to the caller. */
export type MinionAppEvent = {
    type: "build-start";
    build: MinionBuildKind;
};
export type MinionStartResult = {
    kind: "started";
    pid: number;
} | {
    kind: "already-running";
    pid: number;
} | {
    kind: "build-failed";
    build: MinionBuildKind;
} | {
    kind: "lock-conflict";
};
export type MinionKillResult = {
    kind: "killed";
    pid: number;
} | {
    kind: "not-running";
};
export type MinionProcessStatus = {
    running: boolean;
    /** Last recorded pid, if a pid file exists — may belong to a dead process when `running` is false. */
    pid: number | null;
};
export type MinionAppStatus = {
    app: MinionProcessStatus;
    gateway: MinionProcessStatus;
};
export type MinionStartOptions = {
    /** Build and run the debug binary instead of the cached release build. */
    debug?: boolean;
};
type Props = {
    fs: MinionFileSystem;
    process: MinionProcessRunner;
    paths: MinionPaths;
    /** Command used to launch the gateway daemon, e.g. `[process.execPath, "/path/to/gateway-daemon.js"]`. */
    gatewayCommand: string[];
    /** Progress events (build started, ...). Defaults to a no-op — the library never writes to stdout itself. */
    onEvent?: (event: MinionAppEvent) => void;
};
/**
 * Build/start/kill/status for the Swift app and its companion gateway daemon.
 *
 * Expected outcomes ("already running", "build failed", ...) come back as
 * `MinionStartResult` / `MinionKillResult` kinds; unexpected IO failures
 * (unwritable state dir, missing executable, ...) come back as an `Error`
 * value. Nothing throws.
 */
export declare class MinionAppRunner {
    private readonly fs;
    private readonly process;
    private readonly paths;
    private readonly gatewayCommand;
    private readonly onEvent;
    constructor(props: Props);
    start(options?: MinionStartOptions): Promise<MinionStartResult | Error>;
    kill(): MinionKillResult | Error;
    status(): MinionAppStatus;
    private processStatus;
    /** `true` on success, `{kind: "build-failed"}`-worthy `false` on a nonzero exit, `Error` when the build tool couldn't run at all. */
    private build;
    /** Removes the start-lock pid file, then maps a mid-start failure to its result/Error. */
    private releaseLockAfter;
    private startGateway;
    private killGateway;
    private acquireStartLock;
    private readPid;
    private readBuildData;
    private writeBuildData;
}
export {};
