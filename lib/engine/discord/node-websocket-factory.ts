import { toError } from "@lib/engine/errors"
import {
  MinionWebSocketConnection,
  MinionWebSocketFactory,
  type MinionWebSocketHandlers,
} from "@lib/engine/discord/websocket-factory"

class NodeMinionWebSocketConnection extends MinionWebSocketConnection {
  private readonly socket: WebSocket

  constructor(socket: WebSocket) {
    super()
    this.socket = socket
  }

  send(data: string): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(data)
  }

  close(code?: number): void {
    this.socket.close(code)
  }
}

/** Wraps the runtime's global `WebSocket` (present in both Bun and Node 22+). */
export class NodeMinionWebSocketFactory extends MinionWebSocketFactory {
  connect(url: string, handlers: MinionWebSocketHandlers): MinionWebSocketConnection | Error {
    try {
      const socket = new WebSocket(url)
      let closed = false
      // `error` に続いて `close` も発火する実装が普通だが、二重通知で再接続が
      // 二本立ち上がらないよう onClose は一度しか呼ばない。
      const notifyClose = (code?: number): void => {
        if (closed) return
        closed = true
        handlers.onClose({ code })
      }

      socket.addEventListener("open", () => handlers.onOpen())
      socket.addEventListener("message", (event) => {
        if (typeof event.data === "string") handlers.onMessage(event.data)
      })
      socket.addEventListener("close", (event) => notifyClose(event.code))
      socket.addEventListener("error", () => notifyClose(undefined))

      return new NodeMinionWebSocketConnection(socket)
    } catch (thrown) {
      return toError(thrown)
    }
  }
}
