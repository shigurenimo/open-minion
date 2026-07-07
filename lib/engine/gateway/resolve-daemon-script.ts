import { fileURLToPath } from "node:url"

/** Absolute path to the standalone gateway daemon entry, for spawning as a detached process. */
export function resolveGatewayDaemonScript(): string {
  // TS ソース実行時は .ts、dist (tsc 出力) 実行時は .js — 自身と同じ拡張子の隣ファイルを指す。
  const extension = import.meta.url.endsWith(".ts") ? "ts" : "js"
  // URL.pathname はパスに空白や非ASCII文字があるとパーセントエンコードされたまま壊れる
  return fileURLToPath(new URL(`gateway-daemon.${extension}`, import.meta.url))
}
