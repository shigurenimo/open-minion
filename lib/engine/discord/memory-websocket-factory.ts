import {
  MinionWebSocketConnection,
  MinionWebSocketFactory,
  type MinionWebSocketHandlers,
} from "./websocket-factory"

/**
 * Test double that lets a test play the server: inspect frames the client
 * `send()`s via `sent`, and drive the client with `emitOpen()` /
 * `emitMessage()` / `emitClose()`. The factory records every connection in
 * `connections` in the order they were opened (reconnects append).
 */
export class MemoryMinionWebSocketConnection extends MinionWebSocketConnection {
  readonly url: string
  readonly sent: string[] = []
  closedByClient = false
  closeCode: number | undefined

  private readonly handlers: MinionWebSocketHandlers

  constructor(url: string, handlers: MinionWebSocketHandlers) {
    super()
    this.url = url
    this.handlers = handlers
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(code?: number): void {
    this.closedByClient = true
    this.closeCode = code
    this.handlers.onClose({ code })
  }

  emitOpen(): void {
    this.handlers.onOpen()
  }

  emitMessage(data: unknown): void {
    this.handlers.onMessage(typeof data === "string" ? data : JSON.stringify(data))
  }

  emitClose(code?: number): void {
    this.handlers.onClose({ code })
  }
}

export class MemoryMinionWebSocketFactory extends MinionWebSocketFactory {
  readonly connections: MemoryMinionWebSocketConnection[] = []

  /** When set, `connect()` fails with this Error instead of opening a connection. */
  connectError: Error | null = null

  connect(url: string, handlers: MinionWebSocketHandlers): MinionWebSocketConnection | Error {
    if (this.connectError) return this.connectError
    const connection = new MemoryMinionWebSocketConnection(url, handlers)
    this.connections.push(connection)
    return connection
  }

  /** The most recently opened connection — the one a client is currently talking to. */
  latest(): MemoryMinionWebSocketConnection | undefined {
    return this.connections[this.connections.length - 1]
  }
}
