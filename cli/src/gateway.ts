#!/usr/bin/env bun

import { readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const SESSIONS_DIR = join(homedir(), ".claude", "sessions")
const STALE_MS = 8 * 60 * 1000
const TICK_MS = 250
const PORT = Number(process.env.MINION_GATEWAY_PORT) || 4756

// Swift側 PetView.clips と同じ並び順・重み(合計100)。座標や速度はSwiftが持つ
// clip定義とスクリーン形状に依存するため、ここでは「どの行動を・どれだけ続けるか」だけを決める。
const ACTIONS: { durationMs: [number, number]; weight: number }[] = [
  { weight: 14, durationMs: [3000, 6000] }, // 0 待機
  { weight: 10, durationMs: [3000, 6000] }, // 1 歩く
  { weight: 28, durationMs: [4000, 7000] }, // 2 走る
  { weight: 3, durationMs: [1000, 2000] }, // 3 ジャンプ1
  { weight: 3, durationMs: [1000, 2000] }, // 4 ジャンプ2
  { weight: 3, durationMs: [1000, 2000] }, // 5 ジャンプ3
  { weight: 3, durationMs: [1000, 2000] }, // 6 ジャンプ4
  { weight: 8, durationMs: [4000, 7000] }, // 7 座る1
  { weight: 8, durationMs: [4000, 7000] }, // 8 座る2
  { weight: 8, durationMs: [4000, 7000] }, // 9 座る3
  { weight: 8, durationMs: [4000, 7000] }, // 10 座る4
  { weight: 2, durationMs: [2000, 3000] }, // 11 食べる1
  { weight: 2, durationMs: [2000, 3000] }, // 12 食べる2
]
const IDLE_CLIP = 0

function pickAction(): { clipIndex: number; durationMs: number } {
  const roll = Math.random() * 100
  let cumulative = 0
  let chosen = IDLE_CLIP
  for (let i = 0; i < ACTIONS.length; i++) {
    cumulative += ACTIONS[i].weight
    if (roll < cumulative) {
      chosen = i
      break
    }
  }
  const [min, max] = ACTIONS[chosen].durationMs
  return { clipIndex: chosen, durationMs: min + Math.random() * (max - min) }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

// updatedAt はステータスが切り替わった時にしか更新されないため、
// ずっと busy のまま長時間動いているセッションは経過時間だけでは判定できない。
// プロセスが生きている間は経過時間を無視し、死んでから8分の猶予で消す。
interface SessionInfo {
  running: boolean
  name: string
}

function readActiveSessions(): Map<string, SessionInfo> {
  let files: string[]
  try {
    files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"))
  } catch {
    return new Map()
  }

  const now = Date.now()
  const result = new Map<string, SessionInfo>()

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(SESSIONS_DIR, file), "utf8"))
      if (typeof raw.sessionId !== "string" || typeof raw.pid !== "number") continue

      const alive = isPidAlive(raw.pid)
      if (!alive) {
        const updatedAt = raw.updatedAt ?? raw.statusUpdatedAt ?? raw.startedAt
        if (typeof updatedAt !== "number" || now - updatedAt > STALE_MS) continue
      }

      result.set(raw.sessionId, {
        running: alive && raw.status === "busy",
        name: typeof raw.name === "string" ? raw.name : "",
      })
    } catch {
      // 書き込み途中などで壊れているファイルは無視
    }
  }

  return result
}

interface PetBehavior {
  running: boolean
  name: string
  clipIndex: number
  actionEndsAt: number
}

const behaviors = new Map<string, PetBehavior>()
const clients = new Set()

function snapshot() {
  return Array.from(behaviors.entries()).map(([id, b]) => ({
    id,
    state: b.running ? "running" : "sleeping",
    clipIndex: b.clipIndex,
    name: b.name,
  }))
}

function broadcast(): void {
  const payload = JSON.stringify({ sessions: snapshot() })
  for (const ws of clients) {
    ;(ws as { send: (data: string) => void }).send(payload)
  }
}

function tick(): void {
  const now = Date.now()
  const activeSessions = readActiveSessions()
  let dirty = false

  for (const id of behaviors.keys()) {
    if (!activeSessions.has(id)) {
      behaviors.delete(id)
      dirty = true
    }
  }

  for (const [id, info] of activeSessions) {
    const existing = behaviors.get(id)

    if (!existing) {
      const action = info.running ? pickAction() : { clipIndex: IDLE_CLIP, durationMs: 0 }
      behaviors.set(id, {
        running: info.running,
        name: info.name,
        clipIndex: action.clipIndex,
        actionEndsAt: now + action.durationMs,
      })
      dirty = true
      continue
    }

    if (existing.name !== info.name) {
      existing.name = info.name
      dirty = true
    }

    if (existing.running !== info.running) {
      existing.running = info.running
      if (info.running) {
        const action = pickAction()
        existing.clipIndex = action.clipIndex
        existing.actionEndsAt = now + action.durationMs
      }
      dirty = true
    } else if (info.running && now >= existing.actionEndsAt) {
      const action = pickAction()
      existing.clipIndex = action.clipIndex
      existing.actionEndsAt = now + action.durationMs
      dirty = true
    }
  }

  if (dirty) broadcast()
}

setInterval(tick, TICK_MS)
tick()

Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === "/sessions") {
      return Response.json({ sessions: snapshot() })
    }
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return undefined
      return new Response("upgrade failed", { status: 400 })
    }
    return new Response("not found", { status: 404 })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      ws.send(JSON.stringify({ sessions: snapshot() }))
    },
    close(ws) {
      clients.delete(ws)
    },
    message() {
      // クライアントからのメッセージは使わない
    },
  },
})

console.log(`gateway listening on :${PORT}`)
