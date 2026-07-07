import { MinionWebSocketConnection, MinionWebSocketFactory, } from "./websocket-factory.js";
/**
 * Test double that lets a test play the server: inspect frames the client
 * `send()`s via `sent`, and drive the client with `emitOpen()` /
 * `emitMessage()` / `emitClose()`. The factory records every connection in
 * `connections` in the order they were opened (reconnects append).
 */
export class MemoryMinionWebSocketConnection extends MinionWebSocketConnection {
    url;
    sent = [];
    closedByClient = false;
    closeCode;
    handlers;
    constructor(url, handlers) {
        super();
        this.url = url;
        this.handlers = handlers;
    }
    send(data) {
        this.sent.push(data);
    }
    close(code) {
        this.closedByClient = true;
        this.closeCode = code;
        this.handlers.onClose({ code });
    }
    emitOpen() {
        this.handlers.onOpen();
    }
    emitMessage(data) {
        this.handlers.onMessage(typeof data === "string" ? data : JSON.stringify(data));
    }
    emitClose(code) {
        this.handlers.onClose({ code });
    }
}
export class MemoryMinionWebSocketFactory extends MinionWebSocketFactory {
    connections = [];
    /** When set, `connect()` fails with this Error instead of opening a connection. */
    connectError = null;
    connect(url, handlers) {
        if (this.connectError)
            return this.connectError;
        const connection = new MemoryMinionWebSocketConnection(url, handlers);
        this.connections.push(connection);
        return connection;
    }
    /** The most recently opened connection — the one a client is currently talking to. */
    latest() {
        return this.connections[this.connections.length - 1];
    }
}
