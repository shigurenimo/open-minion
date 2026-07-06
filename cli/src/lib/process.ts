import { createHash } from "node:crypto"
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const PACKAGE_ROOT = join(import.meta.dir, "..", "..", "..")
const APP_ROOT = join(PACKAGE_ROOT, "swift")
// bunx はパッケージ本体をキャッシュディレクトリに展開するため、状態とビルド
// 成果物はパッケージの場所に依存しないよう ~/.minion に置く。
const DATA_DIR = join(homedir(), ".minion")
const BUILD_PATH = join(DATA_DIR, "build")
const BIN_PATH = join(BUILD_PATH, "release", "open-minion")
const DEBUG_BIN_PATH = join(BUILD_PATH, "debug", "open-minion")
const DATA_FILE = join(DATA_DIR, "data.json")
const PID_FILE = join(DATA_DIR, "pid")
const CONFIG_FILE = join(DATA_DIR, "config.json")
const GATEWAY_SCRIPT = join(import.meta.dir, "..", "gateway.ts")
const GATEWAY_PID_FILE = join(DATA_DIR, "gateway.pid")

interface BuildData {
  sourceHash: string
}

function computeSourceHash(): string {
  const files = [
    join(APP_ROOT, "Package.swift"),
    ...Array.from(new Bun.Glob("Sources/**/*.swift").scanSync({ cwd: APP_ROOT })).map((f) =>
      join(APP_ROOT, f),
    ),
  ].sort()
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(readFileSync(file))
  }
  return hash.digest("hex")
}

function readBuildData(): BuildData | null {
  if (!existsSync(DATA_FILE)) return null
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"))
  } catch {
    return null
  }
}

function writeBuildData(data: BuildData): void {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function readPid(pidFile: string = PID_FILE): number | null {
  if (!existsSync(pidFile)) return null
  const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10)
  return Number.isNaN(pid) ? null : pid
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function acquireStartLock(): boolean {
  mkdirSync(DATA_DIR, { recursive: true })
  try {
    closeSync(openSync(PID_FILE, "wx"))
    return true
  } catch {
    return false
  }
}

async function build(debug: boolean): Promise<boolean> {
  console.log("ビルド中...")
  const args = debug
    ? ["swift", "build", "--scratch-path", BUILD_PATH]
    : ["swift", "build", "-c", "release", "--scratch-path", BUILD_PATH]
  const proc = Bun.spawn(args, {
    cwd: APP_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  })
  const code = await proc.exited
  if (code !== 0) {
    console.error("ビルド失敗")
    return false
  }
  return true
}

function startGateway(): void {
  const pid = readPid(GATEWAY_PID_FILE)
  if (pid !== null && isRunning(pid)) return

  mkdirSync(DATA_DIR, { recursive: true })
  const proc = Bun.spawn(["bun", GATEWAY_SCRIPT], {
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
  })
  proc.unref()
  writeFileSync(GATEWAY_PID_FILE, String(proc.pid))
}

function killGateway(): void {
  const pid = readPid(GATEWAY_PID_FILE)
  if (pid !== null && isRunning(pid)) {
    process.kill(pid, "SIGTERM")
  }
  rmSync(GATEWAY_PID_FILE, { force: true })
}

export async function startApp(debug: boolean): Promise<string> {
  const existingPid = readPid()
  if (existingPid !== null) {
    if (isRunning(existingPid)) {
      return `すでに起動中 (pid ${existingPid})`
    }
    rmSync(PID_FILE, { force: true })
  }

  if (!acquireStartLock()) {
    return "他の起動処理と競合したため中止"
  }

  const binPath = debug ? DEBUG_BIN_PATH : BIN_PATH

  if (debug) {
    if (!(await build(true))) {
      rmSync(PID_FILE, { force: true })
      return "ビルド失敗"
    }
  } else {
    const currentHash = computeSourceHash()
    const buildData = readBuildData()
    if (!existsSync(binPath) || buildData?.sourceHash !== currentHash) {
      if (!(await build(false))) {
        rmSync(PID_FILE, { force: true })
        return "ビルド失敗"
      }
      writeBuildData({ sourceHash: currentHash })
    }
  }

  const proc = Bun.spawn([binPath], {
    cwd: APP_ROOT,
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
  })
  proc.unref()
  writeFileSync(PID_FILE, String(proc.pid))
  startGateway()
  return `起動した (pid ${proc.pid})`
}

export function killApp(): string {
  killGateway()
  const pid = readPid()
  if (!pid || !isRunning(pid)) {
    if (existsSync(PID_FILE)) rmSync(PID_FILE, { force: true })
    return "起動していない"
  }
  process.kill(pid, "SIGTERM")
  rmSync(PID_FILE, { force: true })
  return `停止した (pid ${pid})`
}

export function statusApp(): string {
  const pid = readPid()
  const appLine = pid && isRunning(pid) ? `起動中 (pid ${pid})` : "停止中"

  const gatewayPid = readPid(GATEWAY_PID_FILE)
  const gatewayLine =
    gatewayPid && isRunning(gatewayPid) ? `gateway起動中 (pid ${gatewayPid})` : "gateway停止中"

  return [appLine, gatewayLine].join("\n")
}

export function readConfig(): Record<string, string> {
  if (!existsSync(CONFIG_FILE)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8"))
  } catch {
    return {}
  }
}

export function writeConfig(config: Record<string, string>): void {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}
