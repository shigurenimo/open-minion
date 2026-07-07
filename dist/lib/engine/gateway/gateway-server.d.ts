import type { Hono } from "hono";
import type { MinionClock } from "../time/clock.ts";
import type { MinionRandomSource } from "../random/random-source.ts";
import { type PetSource } from "./pet-source.ts";
export declare const DEFAULT_GATEWAY_PORT = 4756;
type Props = {
    clock: MinionClock;
    random: MinionRandomSource;
    /**
     * Pet feeds merged on every tick. The gateway has no built-in source —
     * the `Minion` facade assembles the default set (Claude Code sessions,
     * Discord presence) from config, and any `PetSource` implementation can
     * be injected here instead.
     */
    sources: PetSource[];
    port?: number;
    tickMs?: number;
};
export type MinionGatewayHandle = {
    port: number;
    stop(): void;
};
/**
 * In-process HTTP + WebSocket server that merges the pet sources and
 * broadcasts each pet's animation state. `.routes` (the `/sessions` JSON
 * endpoint) is a plain Hono app testable via `.request()`; `.start()` binds
 * a real `node:http` server (via @hono/node-server) plus a `ws` upgrade at
 * `/ws`. Pass `port: 0` to bind an ephemeral port when a test needs a live
 * server.
 */
export declare class MinionGatewayServer {
    readonly routes: Hono;
    /** The injected pet feeds, in merge order — later sources win id collisions. */
    readonly sources: readonly PetSource[];
    private readonly clock;
    private readonly port;
    private readonly tickMs;
    private readonly engine;
    constructor(props: Props);
    /**
     * Binds the real server. Resolves to an Error (instead of throwing or
     * rejecting) when the port is taken or binding fails — `node:http` reports
     * bind failures asynchronously, hence the Promise.
     */
    start(): Promise<MinionGatewayHandle | Error>;
}
export {};
