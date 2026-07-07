import { describe, expect, it } from "vitest"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { MemoryMinionProcessRunner } from "@lib/engine/process/memory-process-runner"
import { MemoryMinionClock } from "@lib/engine/time/memory-clock"
import { MemoryMinionRandomSource } from "@lib/engine/random/memory-random-source"
import { MinionGatewayServer } from "@lib/engine/gateway/gateway-server"

// `.start()` wraps a real `Bun.serve` and isn't exercised here — this suite
// runs under Node (vitest), where the `Bun` global doesn't exist. `.routes`
// is the plain Hono app underneath, so it's fully testable without Bun.
const SESSIONS_DIR = "/home/.claude/sessions"

describe("MinionGatewayServer.routes", () => {
  it("exposes an empty session snapshot before any tick has run", async () => {
    const server = new MinionGatewayServer({
      fs: new MemoryMinionFileSystem(),
      process: new MemoryMinionProcessRunner(),
      clock: new MemoryMinionClock(),
      random: new MemoryMinionRandomSource(),
      sessionsDir: SESSIONS_DIR,
      projectsDir: "/home/.claude/projects",
    })

    const res = await server.routes.request("/sessions")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sessions: [] })
  })

  it("404s on an unknown path", async () => {
    const server = new MinionGatewayServer({
      fs: new MemoryMinionFileSystem(),
      process: new MemoryMinionProcessRunner(),
      clock: new MemoryMinionClock(),
      random: new MemoryMinionRandomSource(),
      sessionsDir: SESSIONS_DIR,
      projectsDir: "/home/.claude/projects",
    })

    const res = await server.routes.request("/nope")

    expect(res.status).toBe(404)
  })
})
