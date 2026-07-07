import { MinionProcessRunner, type RunOptions } from "./process-runner.ts";
export declare class NodeMinionProcessRunner extends MinionProcessRunner {
    runInherit(command: string[], options?: RunOptions): Promise<number | Error>;
    spawnDetached(command: string[], options?: RunOptions): number | Error;
    kill(pid: number, signal?: string): void;
    isAlive(pid: number): boolean;
}
