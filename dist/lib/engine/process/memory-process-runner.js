import { MinionProcessRunner } from "./process-runner.js";
/** Records every call and lets tests stub exit codes, spawned pids, and liveness. */
export class MemoryMinionProcessRunner extends MinionProcessRunner {
    calls = [];
    killed = [];
    nextPid = 1000;
    runInheritHandler = () => 0;
    spawnDetachedHandler = () => {
        this.nextPid += 1;
        return this.nextPid;
    };
    isAliveHandler = () => false;
    onRunInherit(handler) {
        this.runInheritHandler = handler;
        return this;
    }
    onSpawnDetached(handler) {
        this.spawnDetachedHandler = handler;
        return this;
    }
    onIsAlive(handler) {
        this.isAliveHandler = handler;
        return this;
    }
    /** Convenience for tests that only care that a set of pids is "alive". */
    setAlivePids(pids) {
        const alive = new Set(pids);
        this.isAliveHandler = (pid) => alive.has(pid);
        return this;
    }
    async runInherit(command, options = {}) {
        this.calls.push({ kind: "runInherit", command, options });
        return await this.runInheritHandler(command);
    }
    spawnDetached(command, options = {}) {
        this.calls.push({ kind: "spawnDetached", command, options });
        return this.spawnDetachedHandler(command);
    }
    kill(pid, signal = "SIGTERM") {
        this.calls.push({ kind: "kill", pid, signal });
        this.killed.push({ pid, signal });
    }
    isAlive(pid) {
        return this.isAliveHandler(pid);
    }
}
