import { MinionWebSocketConnection, MinionWebSocketFactory, type MinionWebSocketHandlers } from "./websocket-factory.ts";
/** Wraps the runtime's global `WebSocket` (present in both Bun and Node 22+). */
export declare class NodeMinionWebSocketFactory extends MinionWebSocketFactory {
    connect(url: string, handlers: MinionWebSocketHandlers): MinionWebSocketConnection | Error;
}
