/**
 * WebSocket-client boundary. Like the fs/process/clock/random boundaries,
 * domain code never touches the runtime's `WebSocket` global directly —
 * `NodeMinionWebSocketFactory` wraps the real thing, `MemoryMinionWebSocketFactory`
 * lets tests script a fake server end to end.
 *
 * The surface is deliberately tiny: text frames only, and every way a socket
 * can die (error event, clean close, failed connect) funnels into `onClose`
 * so callers have exactly one reconnect path.
 */

export type MinionWebSocketHandlers = {
  onOpen: () => void
  onMessage: (data: string) => void
  onClose: (info: { code?: number }) => void
}

export abstract class MinionWebSocketConnection {
  abstract send(data: string): void
  abstract close(code?: number): void
}

export abstract class MinionWebSocketFactory {
  /** Opens a connection. Returns an Error (instead of throwing) when the socket can't even be constructed, e.g. a malformed URL. */
  abstract connect(
    url: string,
    handlers: MinionWebSocketHandlers,
  ): MinionWebSocketConnection | Error
}
