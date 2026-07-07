import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryMinionRandomSource } from "../random/memory-random-source.ts"
import { DiscordGatewayClient } from "./discord-gateway-client.ts"
import {
  MemoryMinionWebSocketFactory,
  type MemoryMinionWebSocketConnection,
} from "./memory-websocket-factory.ts"

const HELLO = { op: 10, s: null, t: null, d: { heartbeat_interval: 41250 } }
const READY = {
  op: 0,
  s: 1,
  t: "READY",
  d: { session_id: "sess-1", resume_gateway_url: "wss://resume.example" },
}
const GUILD_CREATE = {
  op: 0,
  s: 2,
  t: "GUILD_CREATE",
  d: {
    id: "g1",
    members: [{ user: { id: "u1", username: "alice", global_name: null } }],
    presences: [{ user: { id: "u1" }, status: "online", activities: [] }],
  },
}

function makeClient(factory: MemoryMinionWebSocketFactory): DiscordGatewayClient {
  return new DiscordGatewayClient({
    token: "test-token",
    guildId: "g1",
    webSockets: factory,
    random: new MemoryMinionRandomSource({ values: [0.5] }),
  })
}

function frames(connection: MemoryMinionWebSocketConnection): { op: number; d: unknown }[] {
  return connection.sent.map((raw) => JSON.parse(raw) as { op: number; d: unknown })
}

describe("DiscordGatewayClient", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("identifies with the required intents after HELLO", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()

    const connection = factory.latest()
    expect(connection).toBeDefined()
    if (!connection) return
    expect(connection.url).toContain("wss://gateway.discord.gg")

    connection.emitMessage(HELLO)

    const identify = frames(connection).find((f) => f.op === 2)
    expect(identify).toBeDefined()
    const data = identify?.d as { token: string; intents: number }
    expect(data.token).toBe("test-token")
    // GUILDS + GUILD_MEMBERS + GUILD_PRESENCES
    expect(data.intents).toBe((1 << 0) | (1 << 1) | (1 << 8))
  })

  it("builds presences from GUILD_CREATE and applies PRESENCE_UPDATE", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const connection = factory.latest()
    if (!connection) return

    connection.emitMessage(HELLO)
    connection.emitMessage(READY)
    connection.emitMessage(GUILD_CREATE)
    expect(client.presences().get("u1")).toEqual({ online: true, gaming: false, name: "alice" })

    connection.emitMessage({
      op: 0,
      s: 3,
      t: "PRESENCE_UPDATE",
      d: {
        guild_id: "g1",
        user: { id: "u1" },
        status: "online",
        activities: [{ type: 0, name: "Minecraft" }],
      },
    })
    expect(client.presences().get("u1")?.gaming).toBe(true)
  })

  it("sends periodic heartbeats carrying the last sequence number", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const connection = factory.latest()
    if (!connection) return

    connection.emitMessage(HELLO)
    connection.emitMessage(READY)

    // 初回は interval * jitter(0.5) = 20625ms 後
    vi.advanceTimersByTime(20625)
    const heartbeat = frames(connection).find((f) => f.op === 1)
    expect(heartbeat).toBeDefined()
    expect(heartbeat?.d).toBe(1)

    // ACK を返せば次の周期も心拍が続く
    connection.emitMessage({ op: 11, s: null, t: null, d: null })
    vi.advanceTimersByTime(41250)
    expect(frames(connection).filter((f) => f.op === 1)).toHaveLength(2)
  })

  it("closes and reconnects when a heartbeat is never acked", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const connection = factory.latest()
    if (!connection) return

    connection.emitMessage(HELLO)
    vi.advanceTimersByTime(20625) // 1回目の心拍 (ACKなし)
    vi.advanceTimersByTime(41250) // ACK未着 → close → 再接続予約

    expect(connection.closedByClient).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(factory.connections).toHaveLength(2)
  })

  it("resumes with the stored session after an abnormal close", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const first = factory.latest()
    if (!first) return

    first.emitMessage(HELLO)
    first.emitMessage(READY)
    first.emitMessage(GUILD_CREATE)
    first.emitClose(1006)

    // 切断中も最後の状態を保持する
    expect(client.presences().get("u1")?.online).toBe(true)

    vi.advanceTimersByTime(1000)
    const second = factory.latest()
    expect(second).toBeDefined()
    if (!second) return
    expect(second).not.toBe(first)
    expect(second.url).toContain("wss://resume.example")

    second.emitMessage(HELLO)
    const resume = frames(second).find((f) => f.op === 6)
    expect(resume).toBeDefined()
    expect(resume?.d).toEqual({ token: "test-token", session_id: "sess-1", seq: 2 })
  })

  it("stops retrying and surfaces the error on a fatal close code", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const connection = factory.latest()
    if (!connection) return

    connection.emitClose(4014) // 特権インテント未許可

    expect(client.lastError()?.message).toContain("特権インテント")
    vi.advanceTimersByTime(60_000)
    expect(factory.connections).toHaveLength(1)
  })

  it("does not reconnect after stop()", () => {
    const factory = new MemoryMinionWebSocketFactory()
    const client = makeClient(factory)
    client.start()
    const connection = factory.latest()
    if (!connection) return

    client.stop()
    vi.advanceTimersByTime(60_000)

    expect(connection.closedByClient).toBe(true)
    expect(factory.connections).toHaveLength(1)
  })
})
