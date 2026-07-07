import type { Hono } from "hono"
import { toError } from "@lib/engine/errors"
import type { MinionFileSystem } from "@lib/engine/fs/file-system"
import type { MinionProcessRunner } from "@lib/engine/process/process-runner"
import type { MinionClock } from "@lib/engine/time/clock"
import type { MinionRandomSource } from "@lib/engine/random/random-source"
import { buildGatewayRoutes } from "@lib/engine/gateway/gateway-routes"
import { PetBehaviorEngine } from "@lib/engine/gateway/pet-behavior"
import {
  ClaudeSessionsPetSource,
  mergePetSources,
  type PetSource,
} from "@lib/engine/gateway/pet-source"

export const DEFAULT_GATEWAY_PORT = 4756
const DEFAULT_TICK_MS = 250

type Props = {
  fs: MinionFileSystem
  process: MinionProcessRunner
  clock: MinionClock
  random: MinionRandomSource
  sessionsDir: string
  projectsDir: string
  /** Extra pet sources merged with the Claude Code sessions source on every tick (e.g. Discord presence). */
  extraSources?: PetSource[]
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

  private readonly clock: MinionClock
  private readonly sources: PetSource[]
  private readonly port: number
  private readonly tickMs: number
  private readonly engine: PetBehaviorEngine

  constructor(props: Props) {
    this.clock = props.clock
    this.sources = [
      new ClaudeSessionsPetSource({
        fs: props.fs,
        process: props.process,
        clock: props.clock,
        sessionsDir: props.sessionsDir,
        projectsDir: props.projectsDir,
      }),
      ...(props.extraSources ?? []),
    ]
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
