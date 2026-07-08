import { describe, expect, it } from "vitest"
import { MemoryMinionClock } from "@/lib/engine/time/memory-clock.ts"
import { MemoryMinionRandomSource } from "@/lib/engine/random/memory-random-source.ts"
import { PetSource } from "@/lib/engine/gateway/pet-source.ts"
import type { SessionInfo } from "@/lib/engine/gateway/sessions.ts"
import { MinionGatewayServer } from "@/lib/engine/gateway/gateway-server.ts"

class OnePetSource extends PetSource {
  read(): Map<string, SessionInfo> {
    return new Map([["a", { running: true, name: "repo" }]])
  }
}

function server(sources: PetSource[] = []): MinionGatewayServer {
  return new MinionGatewayServer({
    clock: new MemoryMinionClock(),
    random: new MemoryMinionRandomSource(),
    sources,
    // テストが tick タイマーに追い越されないよう十分長く
    tickMs: 60_000,
    port: 0,
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

describe("MinionGatewayServer.start", () => {
  it("binds a real HTTP + WS server, snapshots over both, and stops cleanly", async () => {
    const handle = await server([new OnePetSource()]).start()
    expect(handle).not.toBeInstanceOf(Error)
    if (handle instanceof Error) return

    const res = await fetch(`http://127.0.0.1:${handle.port}/sessions`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessions: { id: string; state: string }[] }
    expect(body.sessions).toEqual([
      { id: "a", state: "running", clipIndex: expect.any(Number), name: "repo" },
    ])

    const firstFrame = await new Promise<unknown>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${handle.port}/ws`)
      ws.addEventListener("message", (event) => {
        resolve(JSON.parse(String(event.data)))
        ws.close()
      })
      ws.addEventListener("error", () => reject(new Error("ws error")))
    })
    expect(firstFrame).toMatchObject({ sessions: [{ id: "a", state: "running" }] })

    handle.stop()
  })

  it("resolves to an Error (not a rejection) when the port is already taken", async () => {
    const first = await server().start()
    expect(first).not.toBeInstanceOf(Error)
    if (first instanceof Error) return

    const second = await new MinionGatewayServer({
      clock: new MemoryMinionClock(),
      random: new MemoryMinionRandomSource(),
      sources: [],
      port: first.port,
    }).start()

    expect(second).toBeInstanceOf(Error)
    first.stop()
  })
})
