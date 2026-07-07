import { describe, expect, it } from "vitest"
import { isFullMoon, isNewMoon, moonAgeDays } from "@lib/engine/collection/moon"

describe("moonAgeDays", () => {
  it("is 0 at the reference new moon", () => {
    expect(moonAgeDays(new Date(Date.UTC(2000, 0, 6, 18, 14)))).toBe(0)
  })

  it("wraps dates before the reference epoch into [0, synodic)", () => {
    // One synodic month before the epoch is also a new moon.
    const age = moonAgeDays(new Date("1999-12-08T05:30:00.000Z"))
    expect(age).toBeLessThan(0.1)
  })
})

describe("isFullMoon / isNewMoon", () => {
  it("matches real full moons within the ±1-day tolerance", () => {
    expect(isFullMoon(new Date("2024-01-25T12:00:00.000Z"))).toBe(true)
    expect(isFullMoon(new Date("2025-01-13T12:00:00.000Z"))).toBe(true)
  })

  it("matches real new moons within the ±1-day tolerance", () => {
    expect(isNewMoon(new Date("2024-01-11T12:00:00.000Z"))).toBe(true)
    expect(isNewMoon(new Date("2025-01-29T12:00:00.000Z"))).toBe(true)
  })

  it("rejects an ordinary mid-phase day as both", () => {
    const midPhase = new Date("2026-07-06T12:00:00.000Z") // age ~21.2
    expect(isFullMoon(midPhase)).toBe(false)
    expect(isNewMoon(midPhase)).toBe(false)
  })

  it("never reports full and new at once", () => {
    for (let day = 0; day < 30; day++) {
      const date = new Date(Date.UTC(2026, 0, 1 + day, 12))
      expect(isFullMoon(date) && isNewMoon(date)).toBe(false)
    }
  })
})
