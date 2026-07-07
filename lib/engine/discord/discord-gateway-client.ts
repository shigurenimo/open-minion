import { safeJsonParse } from "../errors"
import type { MinionRandomSource } from "../random/random-source"
import { DiscordPresenceCache, type DiscordPresence } from "./presence-cache"
import {
  GATEWAY_OPS,
  REQUIRED_INTENTS,
  gatewayFrameSchema,
  guildCreateDataSchema,
  guildMemberAddDataSchema,
  guildMemberRemoveDataSchema,
  helloDataSchema,
  presenceUpdateDataSchema,
  readyDataSchema,
} from "./gateway-payloads"
import type { MinionWebSocketConnection, MinionWebSocketFactory } from "./websocket-factory"

const DEFAULT_GATEWAY_URL = "wss://gateway.discord.gg"
const GATEWAY_QUERY = "/?v=10&encoding=json"
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30_000

// これらの close code は設定ミス(トークン不正・インテント未許可)なので、
// 再接続しても直らない。lastError に残して止まる。
const FATAL_CLOSE_CODES: Record<number, string> = {
  4004: "Bot トークンが不正です (discord.token を確認してください)",
  4013: "Gateway インテントが不正です",
  4014: "特権インテントが未許可です (Developer Portal で PRESENCE と MEMBERS を有効にしてください)",
}

type Props = {
  token: string
  guildId: string
  webSockets: MinionWebSocketFactory
  random: MinionRandomSource
  /** Watch only these user ids. Unset = every non-bot member of the guild. */
  userIds?: string[]
  /** Overridable for tests. Defaults to Discord's public gateway. */
  gatewayUrl?: string
}

/**
 * Minimal Discord Gateway (WS) client: identify → heartbeat → dispatch →
 * resume, nothing more. Incoming presence events are folded into a
 * `DiscordPresenceCache`; `presences()` serves reads out of that cache, so a
 * dropped connection degrades to "last known state" rather than an empty
 * screen while `lastError()` explains what's wrong (surfaced by
 * `minion discord status`).
 *
 * Follows the library convention: nothing here throws. Socket failures arrive
 * as close events and feed an exponential-backoff reconnect loop; fatal close
 * codes (bad token, missing privileged intents) stop the loop instead, since
 * retrying can't fix configuration.
 */
export class DiscordGatewayClient {
  private readonly token: string
  private readonly webSockets: MinionWebSocketFactory
  private readonly random: MinionRandomSource
  private readonly gatewayUrl: string
  private readonly cache: DiscordPresenceCache

  private connection: MinionWebSocketConnection | null = null
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatAcked = true
  private lastSeq: number | null = null
  private sessionId: string | null = null
  private resumeGatewayUrl: string | null = null
  private reconnectAttempts = 0
  private stopped = true
  private error: Error | null = null

  constructor(props: Props) {
    this.token = props.token
    this.webSockets = props.webSockets
    this.random = props.random
    this.gatewayUrl = props.gatewayUrl ?? DEFAULT_GATEWAY_URL
    this.cache = new DiscordPresenceCache({
      guildId: props.guildId,
      allowedUserIds: props.userIds,
    })
  }

  /** Last known presence per userId — kept across disconnects. */
  presences(): Map<string, DiscordPresence> {
    return this.cache.read()
  }

  /** The most recent connection-level failure, or null while healthy. */
  lastError(): Error | null {
    return this.error
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    this.clearTimers()
    this.connection?.close(1000)
    this.connection = null
  }

  private connect(): void {
    if (this.stopped) return

    const canResume = this.sessionId !== null && this.lastSeq !== null
    const base = canResume && this.resumeGatewayUrl ? this.resumeGatewayUrl : this.gatewayUrl
    const result = this.webSockets.connect(`${base}${GATEWAY_QUERY}`, {
      onOpen: () => {},
      onMessage: (data) => this.handleFrame(data),
      onClose: (info) => this.handleClose(info.code),
    })

    if (result instanceof Error) {
      this.error = result
      this.scheduleReconnect()
      return
    }
    this.connection = result
  }

  private handleFrame(data: string): void {
    const json = safeJsonParse(data)
    if (json instanceof Error) return
    const parsed = gatewayFrameSchema.safeParse(json)
    if (!parsed.success) return
    const frame = parsed.data

    if (frame.s !== null) this.lastSeq = frame.s

    switch (frame.op) {
      case GATEWAY_OPS.hello: {
        const hello = helloDataSchema.safeParse(frame.d)
        if (!hello.success) return
        this.beginHeartbeats(hello.data.heartbeat_interval)
        this.sendIdentifyOrResume()
        return
      }
      case GATEWAY_OPS.heartbeatAck:
        this.heartbeatAcked = true
        return
      case GATEWAY_OPS.heartbeat:
        this.sendHeartbeat()
        return
      case GATEWAY_OPS.reconnect:
        // Discord からの明示的な繋ぎ直し要求。resume 可能な code で閉じる。
        this.connection?.close(4900)
        return
      case GATEWAY_OPS.invalidSession:
        if (frame.d !== true) {
          this.sessionId = null
          this.resumeGatewayUrl = null
          this.lastSeq = null
        }
        this.connection?.close(4901)
        return
      case GATEWAY_OPS.dispatch:
        this.handleDispatch(frame.t, frame.d)
        return
      default:
        return
    }
  }

  private handleDispatch(type: string | null, data: unknown): void {
    switch (type) {
      case "READY": {
        const ready = readyDataSchema.safeParse(data)
        if (!ready.success) return
        this.sessionId = ready.data.session_id
        this.resumeGatewayUrl = ready.data.resume_gateway_url ?? null
        this.reconnectAttempts = 0
        this.error = null
        return
      }
      case "RESUMED":
        this.reconnectAttempts = 0
        this.error = null
        return
      case "GUILD_CREATE": {
        const parsed = guildCreateDataSchema.safeParse(data)
        if (parsed.success) this.cache.applyGuildCreate(parsed.data)
        return
      }
      case "PRESENCE_UPDATE": {
        const parsed = presenceUpdateDataSchema.safeParse(data)
        if (parsed.success) this.cache.applyPresenceUpdate(parsed.data)
        return
      }
      case "GUILD_MEMBER_ADD": {
        const parsed = guildMemberAddDataSchema.safeParse(data)
        if (parsed.success) this.cache.applyGuildMemberAdd(parsed.data)
        return
      }
      case "GUILD_MEMBER_REMOVE": {
        const parsed = guildMemberRemoveDataSchema.safeParse(data)
        if (parsed.success) this.cache.applyGuildMemberRemove(parsed.data)
        return
      }
      default:
        return
    }
  }

  private sendIdentifyOrResume(): void {
    if (this.sessionId !== null && this.lastSeq !== null) {
      this.send(GATEWAY_OPS.resume, {
        token: this.token,
        session_id: this.sessionId,
        seq: this.lastSeq,
      })
      return
    }
    this.send(GATEWAY_OPS.identify, {
      token: this.token,
      intents: REQUIRED_INTENTS,
      // デフォルト(50)だと 50 人超のギルドで GUILD_CREATE の members からオフライン
      // メンバーが欠け、その人は後からオンラインになっても現れない。上限の 250 まで広げる。
      large_threshold: 250,
      properties: { os: process.platform, browser: "open-minion", device: "open-minion" },
    })
  }

  private beginHeartbeats(intervalMs: number): void {
    this.clearHeartbeat()
    this.heartbeatAcked = true
    // 仕様どおり初回だけ interval * jitter ずらし、以降は interval 周期。
    const schedule = (delayMs: number): void => {
      this.heartbeatTimer = setTimeout(() => {
        if (!this.heartbeatAcked) {
          // ACK が返らないゾンビ接続。resume 可能な code で閉じて繋ぎ直す。
          this.connection?.close(4902)
          return
        }
        this.sendHeartbeat()
        schedule(intervalMs)
      }, delayMs)
    }
    schedule(intervalMs * this.random.next())
  }

  private sendHeartbeat(): void {
    this.heartbeatAcked = false
    this.send(GATEWAY_OPS.heartbeat, this.lastSeq)
  }

  private send(op: number, data: unknown): void {
    this.connection?.send(JSON.stringify({ op, d: data }))
  }

  private handleClose(code: number | undefined): void {
    this.clearHeartbeat()
    this.connection = null
    if (this.stopped) return

    const fatal = code !== undefined ? FATAL_CLOSE_CODES[code] : undefined
    if (fatal !== undefined) {
      this.error = new Error(fatal)
      return
    }

    // 4000番台の一部(shard/rate limit系)や不明 code は resume を諦めて identify し直す。
    if (code === 4007 || code === 4009) {
      this.sessionId = null
      this.resumeGatewayUrl = null
      this.lastSeq = null
    }

    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) clearTimeout(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private clearTimers(): void {
    this.clearHeartbeat()
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }
}
