/** Absolute path to the standalone gateway daemon entry, for spawning as a detached process. */
export function resolveGatewayDaemonScript(): string {
  return new URL("gateway-daemon.ts", import.meta.url).pathname
}
