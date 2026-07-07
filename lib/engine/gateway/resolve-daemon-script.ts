import { fileURLToPath } from "node:url"

/** Absolute path to the standalone gateway daemon entry, for spawning as a detached process. */
export function resolveGatewayDaemonScript(): string {
  // URL.pathname はパスに空白や非ASCII文字があるとパーセントエンコードされたまま壊れる
  return fileURLToPath(new URL("gateway-daemon.ts", import.meta.url))
}
