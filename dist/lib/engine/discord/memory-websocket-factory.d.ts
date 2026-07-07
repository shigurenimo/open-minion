import { MinionWebSocketConnection, MinionWebSocketFactory, type MinionWebSocketHandlers } from "./websocket-factory.ts";
/**
 * Test double that lets a test play the server: inspect frames the client
 * `send()`s via `sent`, and drive the client with `emitOpen()` /
 * `emitMessage()` / `emitClose()`. The factory records every connection in
 * `connections` in the order they were opened (reconnects append).
 */
export declare class MemoryMinionWebSocketConnection extends MinionWebSocketConnection {
    readonly url: string;
    readonly sent: string[];
    closedByClient: boolean;
    closeCode: number | undefined;
    private readonly handlers;
    constructor(url: string, handlers: MinionWebSocketHandlers);
    send(data: string): void;
    close(code?: number): void;
    emitOpen(): void;
    emitMessage(data: unknown): void;
    emitClose(code?: number): void;
}
export declare class MemoryMinionWebSocketFactory extends MinionWebSocketFactory {
    readonly connections: MemoryMinionWebSocketConnection[];
    /** When set, `connect()` fails with this Error instead of opening a connection. */
    connectError: Error | null;
    connect(url: string, handlers: MinionWebSocketHandlers): MinionWebSocketConnection | Error;
    /** The most recently opened connection — the one a client is currently talking to. */
    latest(): MemoryMinionWebSocketConnection | undefined;
}
