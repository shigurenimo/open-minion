import { describe, expect, it } from "vitest"
import { MemoryMinionRandomSource } from "@/lib/engine/random/memory-random-source.ts"
import {
  IDLE_CLIP,
  PetBehaviorEngine,
  pickAction,
  pickGamingAction,
  pickSleepingAction,
} from "@/lib/engine/gateway/pet-behavior.ts"
import type { SessionInfo } from "@/lib/engine/gateway/sessions.ts"

describe("pickAction", () => {
  it("picks the first action and its minimum duration when random always returns 0", () => {
    const action = pickAction(new MemoryMinionRandomSource({ values: [0] }))
    expect(action).toEqual({ clipIndex: 0, durationMs: 3000 })
  })

  it("picks the last action near a roll of 100 and scales duration by the fraction", () => {
    const action = pickAction(new MemoryMinionRandomSource({ values: [0.99] }))
    expect(action.clipIndex).toBe(12)
    expect(action.durationMs).toBeCloseTo(2990, 5)
  })
})

describe("pickSleepingAction", () => {
  it("picks idle with its minimum duration when random always returns 0", () => {
    const action = pickSleepingAction(new MemoryMinionRandomSource({ values: [0] }))
    expect(action).toEqual({ clipIndex: IDLE_CLIP, durationMs: 6000 })
  })

  it("picks the last sitting pose near a roll of 100", () => {
    const action = pickSleepingAction(new MemoryMinionRandomSource({ values: [0.99] }))
    expect(action.clipIndex).toBe(10)
  })
})

describe("pickGamingAction", () => {
  it("picks the first sitting pose with its minimum duration when random always returns 0", () => {
    const action = pickGamingAction(new MemoryMinionRandomSource({ values: [0] }))
    expect(action).toEqual({ clipIndex: 7, durationMs: 5000 })
  })

  it("picks the last eating clip near a roll of 100", () => {
    const action = pickGamingAction(new MemoryMinionRandomSource({ values: [0.99] }))
    expect(action.clipIndex).toBe(12)
  })
})

function sessions(entries: Record<string, SessionInfo>): Map<string, SessionInfo> {
  return new Map(Object.entries(entries))
}

describe("PetBehaviorEngine", () => {
  it("assigns a running clip to a newly seen running session", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })

    const dirty = engine.tick(1000, sessions({ a: { running: true, name: "repo" } }))

    expect(dirty).toBe(true)
    expect(engine.snapshot()).toEqual([{ id: "a", state: "running", clipIndex: 0, name: "repo" }])
  })

  it("assigns the idle clip to a newly seen idle session", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource() })

    engine.tick(1000, sessions({ a: { running: false, name: "repo" } }))

    expect(engine.snapshot()).toEqual([
      { id: "a", state: "sleeping", clipIndex: IDLE_CLIP, name: "repo" },
    ])
  })

  it("removes a session that disappears from the active set", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource() })
    engine.tick(1000, sessions({ a: { running: true, name: "repo" } }))

    const dirty = engine.tick(1100, sessions({}))

    expect(dirty).toBe(true)
    expect(engine.snapshot()).toEqual([])
  })

  it("reports dirty when a session's name changes", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource() })
    engine.tick(1000, sessions({ a: { running: true, name: "repo" } }))

    const dirty = engine.tick(1100, sessions({ a: { running: true, name: "renamed" } }))

    expect(dirty).toBe(true)
    expect(engine.snapshot()[0]?.name).toBe("renamed")
  })

  it("resets to the idle clip when a session stops running", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })
    engine.tick(1000, sessions({ a: { running: true, name: "repo" } }))

    const dirty = engine.tick(1100, sessions({ a: { running: false, name: "repo" } }))

    expect(dirty).toBe(true)
    expect(engine.snapshot()[0]?.clipIndex).toBe(IDLE_CLIP)
    expect(engine.snapshot()[0]?.state).toBe("sleeping")
  })

  it("picks a new action once the current one's duration elapses", () => {
    const random = new MemoryMinionRandomSource({ values: [0, 0, 0.99, 0.99] })
    const engine = new PetBehaviorEngine({ random })
    engine.tick(1000, sessions({ a: { running: true, name: "repo" } })) // clip 0, ends at 1000+3000=4000

    const stillWaiting = engine.tick(2000, sessions({ a: { running: true, name: "repo" } }))
    expect(stillWaiting).toBe(false)

    const elapsed = engine.tick(4000, sessions({ a: { running: true, name: "repo" } }))
    expect(elapsed).toBe(true)
    expect(engine.snapshot()[0]?.clipIndex).toBe(12)
  })

  it("rotates a sleeping session through calm poses as durations elapse", () => {
    // tick1: roll 0 → 待機(6000ms)。tick2: roll 0.5 → 座る1。
    const random = new MemoryMinionRandomSource({ values: [0, 0, 0.5, 0] })
    const engine = new PetBehaviorEngine({ random })
    engine.tick(1000, sessions({ a: { running: false, name: "repo" } }))
    expect(engine.snapshot()[0]?.clipIndex).toBe(IDLE_CLIP)

    const stillPosing = engine.tick(4000, sessions({ a: { running: false, name: "repo" } }))
    expect(stillPosing).toBe(false)

    const elapsed = engine.tick(7000, sessions({ a: { running: false, name: "repo" } }))
    expect(elapsed).toBe(true)
    expect(engine.snapshot()[0]?.clipIndex).toBe(7)
    expect(engine.snapshot()[0]?.state).toBe("sleeping")
  })

  it("keeps state 'running' but marks activity while a session is gaming", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })

    engine.tick(1000, sessions({ a: { running: true, name: "friend", activity: "gaming" } }))

    expect(engine.snapshot()).toEqual([
      { id: "a", state: "running", clipIndex: 7, name: "friend", activity: "gaming" },
    ])
  })

  it("re-picks an action immediately when gaming starts or stops", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })
    engine.tick(1000, sessions({ a: { running: true, name: "friend" } }))
    expect(engine.snapshot()[0]?.clipIndex).toBe(0)

    const startedGaming = engine.tick(
      1100,
      sessions({ a: { running: true, name: "friend", activity: "gaming" } }),
    )
    expect(startedGaming).toBe(true)
    expect(engine.snapshot()[0]?.clipIndex).toBe(7)
    expect(engine.snapshot()[0]?.activity).toBe("gaming")

    const stoppedGaming = engine.tick(1200, sessions({ a: { running: true, name: "friend" } }))
    expect(stoppedGaming).toBe(true)
    expect(engine.snapshot()[0]?.activity).toBeUndefined()
  })

  it("ignores a gaming activity on a session that is not running", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })

    engine.tick(1000, sessions({ a: { running: false, name: "friend", activity: "gaming" } }))

    expect(engine.snapshot()).toEqual([
      { id: "a", state: "sleeping", clipIndex: IDLE_CLIP, name: "friend" },
    ])
  })

  it("is not dirty on a steady-state tick with no changes", () => {
    const engine = new PetBehaviorEngine({ random: new MemoryMinionRandomSource({ values: [0] }) })
    engine.tick(1000, sessions({ a: { running: true, name: "repo" } }))

    const dirty = engine.tick(1500, sessions({ a: { running: true, name: "repo" } }))

    expect(dirty).toBe(false)
  })
})
