import { MinionProcessRunner, type RunOptions } from "./process-runner.ts";
export type MemoryProcessCall = {
    kind: "runInherit";
    command: string[];
    options: RunOptions;
} | {
    kind: "spawnDetached";
    command: string[];
    options: RunOptions;
} | {
    kind: "kill";
    pid: number;
    signal: string;
};
export type MemoryRunInheritHandler = (command: string[]) => number | Error | Promise<number | Error>;
export type MemorySpawnDetachedHandler = (command: string[]) => number | Error;
export type MemoryIsAliveHandler = (pid: number) => boolean;
/** Records every call and lets tests stub exit codes, spawned pids, and liveness. */
export declare class MemoryMinionProcessRunner extends MinionProcessRunner {
    readonly calls: MemoryProcessCall[];
    readonly killed: {
        pid: number;
        signal: string;
    }[];
    private nextPid;
    private runInheritHandler;
    private spawnDetachedHandler;
    private isAliveHandler;
    onRunInherit(handler: MemoryRunInheritHandler): this;
    onSpawnDetached(handler: MemorySpawnDetachedHandler): this;
    onIsAlive(handler: MemoryIsAliveHandler): this;
    /** Convenience for tests that only care that a set of pids is "alive". */
    setAlivePids(pids: Iterable<number>): this;
    runInherit(command: string[], options?: RunOptions): Promise<number | Error>;
    spawnDetached(command: string[], options?: RunOptions): number | Error;
    kill(pid: number, signal?: string): void;
    isAlive(pid: number): boolean;
}
