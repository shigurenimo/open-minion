import { MinionProcessRunner, type RunOptions } from "@/lib/engine/process/process-runner.ts"

export type MemoryProcessCall =
  | { kind: "runInherit"; command: string[]; options: RunOptions }
  | { kind: "spawnDetached"; command: string[]; options: RunOptions }
  | { kind: "kill"; pid: number; signal: string }

export type MemoryRunInheritHandler = (
  command: string[],
) => number | Error | Promise<number | Error>
export type MemorySpawnDetachedHandler = (command: string[]) => number | Error
export type MemoryIsAliveHandler = (pid: number) => boolean

/** Records every call and lets tests stub exit codes, spawned pids, and liveness. */
export class MemoryMinionProcessRunner extends MinionProcessRunner {
  readonly calls: MemoryProcessCall[] = []
  readonly killed: { pid: number; signal: string }[] = []

  private nextPid = 1000
  private runInheritHandler: MemoryRunInheritHandler = () => 0
  private spawnDetachedHandler: MemorySpawnDetachedHandler = () => {
    this.nextPid += 1
    return this.nextPid
  }
  private isAliveHandler: MemoryIsAliveHandler = () => false

  onRunInherit(handler: MemoryRunInheritHandler): this {
    this.runInheritHandler = handler
    return this
  }

  onSpawnDetached(handler: MemorySpawnDetachedHandler): this {
    this.spawnDetachedHandler = handler
    return this
  }

  onIsAlive(handler: MemoryIsAliveHandler): this {
    this.isAliveHandler = handler
    return this
  }

  /** Convenience for tests that only care that a set of pids is "alive". */
  setAlivePids(pids: Iterable<number>): this {
    const alive = new Set(pids)
    this.isAliveHandler = (pid) => alive.has(pid)
    return this
  }

  async runInherit(command: string[], options: RunOptions = {}): Promise<number | Error> {
    this.calls.push({ kind: "runInherit", command, options })
    return await this.runInheritHandler(command)
  }

  spawnDetached(command: string[], options: RunOptions = {}): number | Error {
    this.calls.push({ kind: "spawnDetached", command, options })
    return this.spawnDetachedHandler(command)
  }

  kill(pid: number, signal: string = "SIGTERM"): void {
    this.calls.push({ kind: "kill", pid, signal })
    this.killed.push({ pid, signal })
  }

  isAlive(pid: number): boolean {
    return this.isAliveHandler(pid)
  }
}
