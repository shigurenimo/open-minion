import { Hono } from "hono"
import type { PetBehaviorEngine } from "@lib/engine/gateway/pet-behavior"

/**
 * GET /sessions — the current pet snapshot as JSON. Kept as a plain Hono app
 * (rather than inlined into `Bun.serve`'s fetch handler) so it can be
 * exercised with `.request()` in tests without a real Bun server. The `/ws`
 * upgrade path lives in gateway-server.ts since it needs the raw Bun server
 * instance to call `server.upgrade(req)`.
 */
export function buildGatewayRoutes(engine: PetBehaviorEngine) {
  const app = new Hono()
  app.get("/sessions", (c) => c.json({ sessions: engine.snapshot() }))
  return app
}

export type GatewayRoutesApp = ReturnType<typeof buildGatewayRoutes>
