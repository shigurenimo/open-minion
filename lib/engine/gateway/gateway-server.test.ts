import { describe, expect, it } from "vitest"
import { MemoryMinionClock } from "../time/memory-clock"
import { MemoryMinionRandomSource } from "../random/memory-random-source"
import { MinionGatewayServer } from "./gateway-server"

// `.start()` wraps a real `Bun.serve` and isn't exercised here — this suite
// runs under Node (vitest), where the `Bun` global doesn't exist. `.routes`
// is the plain Hono app underneath, so it's fully testable without Bun.
function server(): MinionGatewayServer {
  return new MinionGatewayServer({
    clock: new MemoryMinionClock(),
    random: new MemoryMinionRandomSource(),
    sources: [],
  })
}

describe("MinionGatewayServer.routes", () => {
  it("exposes an empty session snapshot before any tick has run", async () => {
    const res = await server().routes.request("/sessions")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sessions: [] })
  })

  it("404s on an unknown path", async () => {
    const res = await server().routes.request("/nope")

    expect(res.status).toBe(404)
  })
})
