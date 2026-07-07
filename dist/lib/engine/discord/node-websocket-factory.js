import { toError } from "../errors.js";
import { MinionWebSocketConnection, MinionWebSocketFactory, } from "./websocket-factory.js";
class NodeMinionWebSocketConnection extends MinionWebSocketConnection {
    socket;
    constructor(socket) {
        super();
        this.socket = socket;
    }
    send(data) {
        if (this.socket.readyState === WebSocket.OPEN)
            this.socket.send(data);
    }
    close(code) {
        this.socket.close(code);
    }
}
/** Wraps the runtime's global `WebSocket` (present in both Bun and Node 22+). */
export class NodeMinionWebSocketFactory extends MinionWebSocketFactory {
    connect(url, handlers) {
        try {
            const socket = new WebSocket(url);
            let closed = false;
            // `error` に続いて `close` も発火する実装が普通だが、二重通知で再接続が
            // 二本立ち上がらないよう onClose は一度しか呼ばない。
            const notifyClose = (code) => {
                if (closed)
                    return;
                closed = true;
                handlers.onClose({ code });
            };
            socket.addEventListener("open", () => handlers.onOpen());
            socket.addEventListener("message", (event) => {
                if (typeof event.data === "string")
                    handlers.onMessage(event.data);
            });
            socket.addEventListener("close", (event) => notifyClose(event.code));
            socket.addEventListener("error", () => notifyClose(undefined));
            return new NodeMinionWebSocketConnection(socket);
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
}
