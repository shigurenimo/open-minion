import type { MinionRandomSource } from "@lib/engine/random/random-source"
import type { SessionInfo } from "@lib/engine/gateway/sessions"

export const IDLE_CLIP = 0

// Swift側 PetView.clips と同じ並び順・重み(合計100)。座標や速度はSwiftが持つ
// clip定義とスクリーン形状に依存するため、ここでは「どの行動を・どれだけ続けるか」だけを決める。
export const ACTIONS: { durationMs: [number, number]; weight: number }[] = [
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

// 稼働していないセッション用の「静かな」行動だけの部分集合(clipIndexはACTIONS/Swiftの
// 並びを指す)。移動・ジャンプ・食事は含めず、待機と座り姿勢をゆっくり切り替える。
export const SLEEPING_ACTIONS: {
  clipIndex: number
  durationMs: [number, number]
  weight: number
}[] = [
  { clipIndex: 0, weight: 40, durationMs: [6000, 12000] }, // 待機
  { clipIndex: 7, weight: 15, durationMs: [6000, 12000] }, // 座る1
  { clipIndex: 8, weight: 15, durationMs: [6000, 12000] }, // 座る2
  { clipIndex: 9, weight: 15, durationMs: [6000, 12000] }, // 座る3
  { clipIndex: 10, weight: 15, durationMs: [6000, 12000] }, // 座る4
]

export type PetAction = { clipIndex: number; durationMs: number }

export function pickAction(random: MinionRandomSource): PetAction {
  const roll = random.next() * 100
  let cumulative = 0
  let chosen = IDLE_CLIP

  for (let i = 0; i < ACTIONS.length; i++) {
    const action = ACTIONS[i]
    if (!action) continue
    cumulative += action.weight
    if (roll < cumulative) {
      chosen = i
      break
    }
  }

  const chosenAction = ACTIONS[chosen]
  const [min, max] = chosenAction?.durationMs ?? [0, 0]
  return { clipIndex: chosen, durationMs: min + random.next() * (max - min) }
}

export function pickSleepingAction(random: MinionRandomSource): PetAction {
  const roll = random.next() * 100
  let cumulative = 0
  let chosen = SLEEPING_ACTIONS[0]

  for (const action of SLEEPING_ACTIONS) {
    cumulative += action.weight
    if (roll < cumulative) {
      chosen = action
      break
    }
  }

  const [min, max] = chosen?.durationMs ?? [0, 0]
  return {
    clipIndex: chosen?.clipIndex ?? IDLE_CLIP,
    durationMs: min + random.next() * (max - min),
  }
}

export type PetBehavior = {
  running: boolean
  name: string
  clipIndex: number
  actionEndsAt: number
}

export type PetSnapshotEntry = {
  id: string
  state: "running" | "sleeping"
  clipIndex: number
  name: string
}

/**
 * Pure per-session state machine: given the latest active-session snapshot and
 * the current time, decides each pet's animation clip and how long it plays.
 * Holds no IO — safe to tick from a test with a fake clock and random source.
 */
export class PetBehaviorEngine {
  private readonly random: MinionRandomSource
  private readonly behaviors = new Map<string, PetBehavior>()

  constructor(props: { random: MinionRandomSource }) {
    this.random = props.random
  }

  /** Advances state given `now` and the latest active sessions. Returns whether anything changed. */
  tick(now: number, activeSessions: Map<string, SessionInfo>): boolean {
    let dirty = false

    for (const id of this.behaviors.keys()) {
      if (!activeSessions.has(id)) {
        this.behaviors.delete(id)
        dirty = true
      }
    }

    for (const [id, info] of activeSessions) {
      const existing = this.behaviors.get(id)

      if (!existing) {
        const action = info.running ? pickAction(this.random) : pickSleepingAction(this.random)
        this.behaviors.set(id, {
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
        // 稼働が止まったときも静かな姿勢を選び直す(走りの途中コマで固まらないように)。
        const action = info.running ? pickAction(this.random) : pickSleepingAction(this.random)
        existing.clipIndex = action.clipIndex
        existing.actionEndsAt = now + action.durationMs
        dirty = true
      } else if (now >= existing.actionEndsAt) {
        const action = info.running ? pickAction(this.random) : pickSleepingAction(this.random)
        if (action.clipIndex !== existing.clipIndex) dirty = true
        existing.clipIndex = action.clipIndex
        existing.actionEndsAt = now + action.durationMs
      }
    }

    return dirty
  }

  snapshot(): PetSnapshotEntry[] {
    return Array.from(this.behaviors.entries()).map(([id, b]) => ({
      id,
      state: b.running ? "running" : "sleeping",
      clipIndex: b.clipIndex,
      name: b.name,
    }))
  }
}
