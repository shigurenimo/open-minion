import type {
  MinionAppStatus,
  MinionKillResult,
  MinionStartResult,
} from "../../../lib/engine/app/app-runner"

// ライブラリは構造化された結果を返す。日本語の表示文字列への整形はCLIの責務。

export function formatStartResult(result: MinionStartResult): string {
  switch (result.kind) {
    case "started":
      return `起動した (pid ${result.pid})`
    case "already-running":
      return `すでに起動中 (pid ${result.pid})`
    case "build-failed":
      return "ビルド失敗"
    case "lock-conflict":
      return "他の起動処理と競合したため中止"
  }
}

export function isStartError(result: MinionStartResult): boolean {
  return result.kind === "build-failed" || result.kind === "lock-conflict"
}

export function formatKillResult(result: MinionKillResult): string {
  return result.kind === "killed" ? `停止した (pid ${result.pid})` : "起動していない"
}

export function formatAppStatus(status: MinionAppStatus): string {
  const appLine = status.app.running ? `起動中 (pid ${status.app.pid})` : "停止中"
  const gatewayLine = status.gateway.running
    ? `gateway起動中 (pid ${status.gateway.pid})`
    : "gateway停止中"
  return [appLine, gatewayLine].join("\n")
}
