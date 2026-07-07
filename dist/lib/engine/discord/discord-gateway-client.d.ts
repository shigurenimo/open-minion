import type { MinionRandomSource } from "../random/random-source.ts";
import { type DiscordPresence } from "./presence-cache.ts";
import type { MinionWebSocketFactory } from "./websocket-factory.ts";
type Props = {
    token: string;
    guildId: string;
    webSockets: MinionWebSocketFactory;
    random: MinionRandomSource;
    /** Watch only these user ids. Unset = every non-bot member of the guild. */
    userIds?: string[];
    /** Overridable for tests. Defaults to Discord's public gateway. */
    gatewayUrl?: string;
};
/**
 * Minimal Discord Gateway (WS) client: identify → heartbeat → dispatch →
 * resume, nothing more. Incoming presence events are folded into a
 * `DiscordPresenceCache`; `presences()` serves reads out of that cache, so a
 * dropped connection degrades to "last known state" rather than an empty
 * screen while `lastError()` explains what's wrong (surfaced by
 * `minion discord status`).
 *
 * Follows the library convention: nothing here throws. Socket failures arrive
 * as close events and feed an exponential-backoff reconnect loop; fatal close
 * codes (bad token, missing privileged intents) stop the loop instead, since
 * retrying can't fix configuration.
 */
export declare class DiscordGatewayClient {
    private readonly token;
    private readonly webSockets;
    private readonly random;
    private readonly gatewayUrl;
    private readonly cache;
    private connection;
    private heartbeatTimer;
    private reconnectTimer;
    private heartbeatAcked;
    private lastSeq;
    private sessionId;
    private resumeGatewayUrl;
    private reconnectAttempts;
    private stopped;
    private error;
    constructor(props: Props);
    /** Last known presence per userId — kept across disconnects. */
    presences(): Map<string, DiscordPresence>;
    /** The most recent connection-level failure, or null while healthy. */
    lastError(): Error | null;
    start(): void;
    stop(): void;
    private connect;
    private handleFrame;
    private handleDispatch;
    private sendIdentifyOrResume;
    private beginHeartbeats;
    private sendHeartbeat;
    private send;
    private handleClose;
    private scheduleReconnect;
    private clearHeartbeat;
    private clearTimers;
}
export {};
