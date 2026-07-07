import { Hono } from "hono";
import type { PetBehaviorEngine } from "./pet-behavior.ts";
/**
 * GET /sessions — the current pet snapshot as JSON. Kept as a plain Hono app
 * (rather than inlined into the server's fetch handler) so it can be
 * exercised with `.request()` in tests without a live server. The `/ws`
 * upgrade path lives in gateway-server.ts since it needs the raw HTTP server
 * instance to call `server.upgrade(req)`.
 */
export declare function buildGatewayRoutes(engine: PetBehaviorEngine): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
export type GatewayRoutesApp = ReturnType<typeof buildGatewayRoutes>;
