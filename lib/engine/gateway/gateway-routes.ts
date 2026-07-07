import { Hono } from "hono"
import type { PetBehaviorEngine } from "./pet-behavior.ts"

/**
 * GET /sessions — the current pet snapshot as JSON. Kept as a plain Hono app
 * (rather than inlined into the server's fetch handler) so it can be
 * exercised with `.request()` in tests without a live server. The `/ws`
 * upgrade path lives in gateway-server.ts since it needs the raw HTTP server
 * instance to call `server.upgrade(req)`.
 */
export function buildGatewayRoutes(engine: PetBehaviorEngine) {
  const app = new Hono()
  app.get("/sessions", (c) => c.json({ sessions: engine.snapshot() }))
  return app
}

export type GatewayRoutesApp = ReturnType<typeof buildGatewayRoutes>
