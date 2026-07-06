import { describe, expect, it } from "vitest"
import { MemoryMinionRandomSource } from "@lib/engine/random/memory-random-source"
import { PetBehaviorEngine } from "@lib/engine/gateway/pet-behavior"
import { buildGatewayRoutes } from "@lib/engine/gateway/gateway-routes"

describe("buildGatewayRoutes", () => {
  it("returns an empty session list from a fresh engine", async () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource() })
    const routes = buildGatewayRoutes(engine)

    const res = await routes.request("/sessions")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sessions: [] })
  })

  it("reflects the engine's current snapshot", async () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })
    engine.tick(1000, new Map([["a", { running: true, name: "repo" }]]))
    const routes = buildGatewayRoutes(engine)

    const res = await routes.request("/sessions")

    expect(await res.json()).toEqual({
      sessions: [{ id: "a", state: "running", clipIndex: 0, name: "repo" }],
    })
  })

  it("404s on an unknown path", async () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource() })
    const routes = buildGatewayRoutes(engine)

    const res = await routes.request("/nope")

    expect(res.status).toBe(404)
  })
})
