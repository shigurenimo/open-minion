import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { toError } from "../errors.js";
import { buildGatewayRoutes } from "./gateway-routes.js";
import { PetBehaviorEngine } from "./pet-behavior.js";
import { mergePetSources } from "./pet-source.js";
export const DEFAULT_GATEWAY_PORT = 4756;
const DEFAULT_TICK_MS = 250;
/**
 * In-process HTTP + WebSocket server that merges the pet sources and
 * broadcasts each pet's animation state. `.routes` (the `/sessions` JSON
 * endpoint) is a plain Hono app testable via `.request()`; `.start()` binds
 * a real `node:http` server (via @hono/node-server) plus a `ws` upgrade at
 * `/ws`. Pass `port: 0` to bind an ephemeral port when a test needs a live
 * server.
 */
export class MinionGatewayServer {
    routes;
    /** The injected pet feeds, in merge order — later sources win id collisions. */
    sources;
    clock;
    port;
    tickMs;
    engine;
    constructor(props) {
        this.clock = props.clock;
        this.sources = [...props.sources];
        this.port = props.port ?? DEFAULT_GATEWAY_PORT;
        this.tickMs = props.tickMs ?? DEFAULT_TICK_MS;
        this.engine = new PetBehaviorEngine({ random: props.random });
        this.routes = buildGatewayRoutes(this.engine);
    }
    /**
     * Binds the real server. Resolves to an Error (instead of throwing or
     * rejecting) when the port is taken or binding fails — `node:http` reports
     * bind failures asynchronously, hence the Promise.
     */
    async start() {
        const engine = this.engine;
        const routes = this.routes;
        const wss = new WebSocketServer({ noServer: true });
        const broadcast = () => {
            const payload = JSON.stringify({ sessions: engine.snapshot() });
            for (const ws of wss.clients)
                ws.send(payload);
        };
        const tick = () => {
            const now = this.clock.millis();
            if (engine.tick(now, mergePetSources(this.sources)))
                broadcast();
        };
        for (const source of this.sources)
            source.start();
        const interval = setInterval(tick, this.tickMs);
        tick();
        const cleanup = () => {
            clearInterval(interval);
            for (const source of this.sources)
                source.stop();
        };
        try {
            const server = serve({ fetch: routes.fetch, port: this.port, hostname: "127.0.0.1" });
            server.on("upgrade", (request, socket, head) => {
                const pathname = (request.url ?? "").split("?")[0];
                if (pathname !== "/ws") {
                    socket.destroy();
                    return;
                }
                wss.handleUpgrade(request, socket, head, (ws) => {
                    ws.send(JSON.stringify({ sessions: engine.snapshot() }));
                    // クライアントからのメッセージは使わない。close は wss.clients が追跡する。
                });
            });
            const bound = await new Promise((resolve) => {
                server.once("error", (err) => resolve(toError(err)));
                server.once("listening", () => {
                    const address = server.address();
                    resolve(typeof address === "object" && address !== null ? address.port : this.port);
                });
            });
            if (bound instanceof Error) {
                cleanup();
                return bound;
            }
            return {
                port: bound,
                stop: () => {
                    cleanup();
                    for (const ws of wss.clients)
                        ws.terminate();
                    wss.close();
                    server.close();
                    if ("closeAllConnections" in server)
                        server.closeAllConnections();
                },
            };
        }
        catch (thrown) {
            cleanup();
            return toError(thrown);
        }
    }
}
