import { spawn } from "node:child_process"
import { toError } from "@/lib/engine/errors.ts"
import { MinionProcessRunner, type RunOptions } from "@/lib/engine/process/process-runner.ts"

export class NodeMinionProcessRunner extends MinionProcessRunner {
  async runInherit(command: string[], options: RunOptions = {}): Promise<number | Error> {
    try {
      const cmd = command[0]
      const args = command.slice(1)
      const proc = spawn(cmd ?? "", args, {
        cwd: options.cwd,
        stdio: ["inherit", "inherit", "inherit"],
      })
      return await new Promise<number | Error>((resolve) => {
        proc.once("error", (err) => resolve(toError(err)))
        proc.once("close", (code) => resolve(code ?? 1))
      })
    } catch (thrown) {
      return toError(thrown)
    }
  }

  spawnDetached(command: string[], options: RunOptions = {}): number | Error {
    try {
      const cmd = command[0]
      const args = command.slice(1)
      const proc = spawn(cmd ?? "", args, {
        cwd: options.cwd,
        detached: true,
        stdio: "ignore",
      })
      // spawn は非同期にしか失敗を通知しない (ENOENT 等)。unref 済みの孤児プロセスの
      // error はプロセス全体を落とすので、握って以後の isAlive 判定に任せる。
      proc.once("error", () => {})
      proc.unref()
      if (proc.pid === undefined) return new Error(`起動に失敗しました: ${command.join(" ")}`)
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
