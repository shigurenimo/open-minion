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
export class MinionWebSocketConnection {
}
export class MinionWebSocketFactory {
}
