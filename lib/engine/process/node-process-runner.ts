import { toError } from "../errors"
import { MinionProcessRunner, type RunOptions } from "./process-runner"

export class NodeMinionProcessRunner extends MinionProcessRunner {
  async runInherit(command: string[], options: RunOptions = {}): Promise<number | Error> {
    try {
      const [cmd, ...args] = command
      const proc = Bun.spawn([cmd ?? "", ...args], {
        cwd: options.cwd,
        stdout: "inherit",
        stderr: "inherit",
      })
      return await proc.exited
    } catch (thrown) {
      return toError(thrown)
    }
  }

  spawnDetached(command: string[], options: RunOptions = {}): number | Error {
    try {
      const [cmd, ...args] = command
      const proc = Bun.spawn([cmd ?? "", ...args], {
        cwd: options.cwd,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      })
      proc.unref()
      return proc.pid
    } catch (thrown) {
      return toError(thrown)
    }
  }

  kill(pid: number, signal: string = "SIGTERM"): void {
    try {
      process.kill(pid, signal)
    } catch {
      // already dead — nothing to do
    }
  }

  isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }
}
