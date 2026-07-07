import type { Hono } from "hono"
import { toError } from "@lib/engine/errors"
import type { MinionClock } from "@lib/engine/time/clock"
import type { MinionRandomSource } from "@lib/engine/random/random-source"
import { buildGatewayRoutes } from "@lib/engine/gateway/gateway-routes"
import { PetBehaviorEngine } from "@lib/engine/gateway/pet-behavior"
import { mergePetSources, type PetSource } from "@lib/engine/gateway/pet-source"

export const DEFAULT_GATEWAY_PORT = 4756
const DEFAULT_TICK_MS = 250

type Props = {
  clock: MinionClock
  random: MinionRandomSource
  /**
   * Pet feeds merged on every tick. The gateway has no built-in source —
   * the `Minion` facade assembles the default set (Claude Code sessions,
   * Discord presence) from config, and any `PetSource` implementation can
   * be injected here instead.
   */
  sources: PetSource[]
  port?: number
  tickMs?: number
}

export type MinionGatewayHandle = {
  port: number
  stop(): void
}

/**
 * In-process HTTP + WebSocket server that watches the sessions directory and
 * broadcasts each pet's animation state. `.routes` (the `/sessions` JSON
 * endpoint) is a plain Hono app testable via `.request()`; `.start()` wraps
 * it plus the `/ws` upgrade in a real `Bun.serve` — like the IO boundaries
 * this class composes, that call is a genuine runtime dependency rather than
 * something behind an interface, so pass `port: 0` to bind an ephemeral port
 * when a test does need a live server.
 */
export class MinionGatewayServer {
  readonly routes: Hono
  /** The injected pet feeds, in merge order — later sources win id collisions. */
  readonly sources: readonly PetSource[]

  private readonly clock: MinionClock
  private readonly port: number
  private readonly tickMs: number
  private readonly engine: PetBehaviorEngine

  constructor(props: Props) {
    this.clock = props.clock
    this.sources = [...props.sources]
    this.port = props.port ?? DEFAULT_GATEWAY_PORT
    this.tickMs = props.tickMs ?? DEFAULT_TICK_MS
    this.engine = new PetBehaviorEngine({ random: props.random })
    this.routes = buildGatewayRoutes(this.engine)
  }

  /** Binds the real server. Returns an Error (instead of throwing) when the port is taken or binding fails. */
  start(): MinionGatewayHandle | Error {
    const engine = this.engine
    const routes = this.routes
    const clients = new Set<{ send: (data: string) => void }>()

    const broadcast = (): void => {
      const payload = JSON.stringify({ sessions: engine.snapshot() })
      for (const ws of clients) ws.send(payload)
    }

    const tick = (): void => {
      const now = this.clock.millis()
      if (engine.tick(now, mergePetSources(this.sources))) broadcast()
    }

    for (const source of this.sources) source.start()
    const interval = setInterval(tick, this.tickMs)
    tick()

    try {
      const server = Bun.serve({
        port: this.port,
        fetch(req, srv) {
          const url = new URL(req.url)
          if (url.pathname === "/ws") {
            if (srv.upgrade(req)) return undefined
            return new Response("upgrade failed", { status: 400 })
          }
          return routes.fetch(req)
        },
        websocket: {
          open(ws) {
            clients.add(ws)
            ws.send(JSON.stringify({ sessions: engine.snapshot() }))
          },
          close(ws) {
            clients.delete(ws)
          },
          message() {
            // クライアントからのメッセージは使わない
          },
        },
      })

      return {
        port: server.port ?? this.port,
        stop: () => {
          clearInterval(interval)
          for (const source of this.sources) source.stop()
          void server.stop(true)
        },
      }
    } catch (thrown) {
      clearInterval(interval)
      for (const source of this.sources) source.stop()
      return toError(thrown)
    }
  }
}
