import { z } from "zod";
import { safeJsonParse } from "../errors.js";
import { computeSourceHash } from "./source-hash.js";
const buildDataSchema = z.object({ sourceHash: z.string() });
/**
 * Build/start/kill/status for the Swift app and its companion gateway daemon.
 *
 * Expected outcomes ("already running", "build failed", ...) come back as
 * `MinionStartResult` / `MinionKillResult` kinds; unexpected IO failures
 * (unwritable state dir, missing executable, ...) come back as an `Error`
 * value. Nothing throws.
 */
export class MinionAppRunner {
    fs;
    process;
    paths;
    gatewayCommand;
    onEvent;
    constructor(props) {
        this.fs = props.fs;
        this.process = props.process;
        this.paths = props.paths;
        this.gatewayCommand = props.gatewayCommand;
        this.onEvent = props.onEvent ?? (() => { });
    }
    async start(options = {}) {
        const debug = options.debug ?? false;
        const existingPid = this.readPid(this.paths.pidFile);
        if (existingPid !== null) {
            if (this.process.isAlive(existingPid)) {
                return { kind: "already-running", pid: existingPid };
            }
            const rmError = this.fs.rmSync(this.paths.pidFile, { force: true });
            if (rmError)
                return rmError;
        }
        const lock = this.acquireStartLock();
        if (lock instanceof Error)
            return lock;
        if (!lock)
            return { kind: "lock-conflict" };
        const build = debug ? "debug" : "release";
        const binPath = debug ? this.paths.debugBinPath : this.paths.binPath;
        if (debug) {
            const built = await this.build(build);
            if (built !== true)
                return this.releaseLockAfter(built, build);
        }
        else {
            // A hash failure (unreadable source tree) just means "hash unknown":
            // build unconditionally and skip recording, so the next start re-checks.
            const currentHash = computeSourceHash({ fs: this.fs, appRoot: this.paths.appRoot });
            const buildData = this.readBuildData();
            if (!this.fs.existsSync(binPath) || buildData?.sourceHash !== currentHash) {
                const built = await this.build(build);
                if (built !== true)
                    return this.releaseLockAfter(built, build);
                if (typeof currentHash === "string") {
                    const writeError = this.writeBuildData({ sourceHash: currentHash });
                    if (writeError)
                        return this.releaseLockAfter(writeError, build);
                }
            }
        }
        const pid = this.process.spawnDetached([binPath], { cwd: this.paths.appRoot });
        if (pid instanceof Error)
            return this.releaseLockAfter(pid, build);
        const pidWriteError = this.fs.writeFileSync(this.paths.pidFile, String(pid));
        if (pidWriteError) {
            // Untracked would mean unkillable — take the app back down.
            this.process.kill(pid, "SIGTERM");
            return this.releaseLockAfter(pidWriteError, build);
        }
        const gatewayError = this.startGateway();
        if (gatewayError)
            return gatewayError;
        return { kind: "started", pid };
    }
    kill() {
        const gatewayError = this.killGateway();
        if (gatewayError)
            return gatewayError;
        const pid = this.readPid(this.paths.pidFile);
        if (!pid || !this.process.isAlive(pid)) {
            if (this.fs.existsSync(this.paths.pidFile)) {
                const rmError = this.fs.rmSync(this.paths.pidFile, { force: true });
                if (rmError)
                    return rmError;
            }
            return { kind: "not-running" };
        }
        this.process.kill(pid, "SIGTERM");
        const rmError = this.fs.rmSync(this.paths.pidFile, { force: true });
        if (rmError)
            return rmError;
        return { kind: "killed", pid };
    }
    status() {
        return {
            app: this.processStatus(this.paths.pidFile),
            gateway: this.processStatus(this.paths.gatewayPidFile),
        };
    }
    processStatus(pidFile) {
        const pid = this.readPid(pidFile);
        return { running: pid !== null && this.process.isAlive(pid), pid };
    }
    /** `true` on success, `{kind: "build-failed"}`-worthy `false` on a nonzero exit, `Error` when the build tool couldn't run at all. */
    async build(build) {
        this.onEvent({ type: "build-start", build });
        const args = build === "debug"
            ? ["swift", "build", "--scratch-path", this.paths.buildPath]
            : ["swift", "build", "-c", "release", "--scratch-path", this.paths.buildPath];
        const exitCode = await this.process.runInherit(args, { cwd: this.paths.appRoot });
        if (exitCode instanceof Error)
            return exitCode;
        return exitCode === 0;
    }
    /** Removes the start-lock pid file, then maps a mid-start failure to its result/Error. */
    releaseLockAfter(failure, build) {
        this.fs.rmSync(this.paths.pidFile, { force: true });
        return failure === false ? { kind: "build-failed", build } : failure;
    }
    startGateway() {
        const pid = this.readPid(this.paths.gatewayPidFile);
        if (pid !== null && this.process.isAlive(pid))
            return null;
        const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true });
        if (mkdirError)
            return mkdirError;
        const spawnedPid = this.process.spawnDetached(this.gatewayCommand);
        if (spawnedPid instanceof Error)
            return spawnedPid;
        const writeError = this.fs.writeFileSync(this.paths.gatewayPidFile, String(spawnedPid));
        if (writeError) {
            this.process.kill(spawnedPid, "SIGTERM");
            return writeError;
        }
        return null;
    }
    killGateway() {
        const pid = this.readPid(this.paths.gatewayPidFile);
        if (pid !== null && this.process.isAlive(pid)) {
            this.process.kill(pid, "SIGTERM");
        }
        return this.fs.rmSync(this.paths.gatewayPidFile, { force: true });
    }
    acquireStartLock() {
        const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true });
        if (mkdirError)
            return mkdirError;
        return this.fs.createExclusiveSync(this.paths.pidFile);
    }
    readPid(pidFile) {
        if (!this.fs.existsSync(pidFile))
            return null;
        const content = this.fs.readFileSync(pidFile);
        if (content instanceof Error)
            return null;
        const pid = Number.parseInt(content.trim(), 10);
        return Number.isNaN(pid) ? null : pid;
    }
    readBuildData() {
        if (!this.fs.existsSync(this.paths.dataFile))
            return null;
        const content = this.fs.readFileSync(this.paths.dataFile);
        if (content instanceof Error)
            return null;
        const json = safeJsonParse(content);
        if (json instanceof Error)
            return null;
        const parsed = buildDataSchema.safeParse(json);
        return parsed.success ? parsed.data : null;
    }
    writeBuildData(data) {
        const mkdirError = this.fs.mkdirSync(this.paths.dataDir, { recursive: true });
        if (mkdirError)
            return mkdirError;
        return this.fs.writeFileSync(this.paths.dataFile, JSON.stringify(data, null, 2));
    }
}
