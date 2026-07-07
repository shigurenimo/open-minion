import { describe, expect, it } from "vitest"
import { isNextDay, recentDates, sumRecentDays } from "./date-window"

describe("recentDates", () => {
  it("returns the requested number of dates, most-recent first", () => {
    expect(recentDates("2026-07-06", 3)).toEqual(["2026-07-06", "2026-07-05", "2026-07-04"])
  })

  it("crosses a month boundary correctly", () => {
    expect(recentDates("2026-07-01", 2)).toEqual(["2026-07-01", "2026-06-30"])
  })
})

describe("sumRecentDays", () => {
  it("sums only the dates within the window", () => {
    const byDate = { "2026-07-06": 10, "2026-07-05": 20, "2026-06-01": 999 }
    expect(sumRecentDays(byDate, "2026-07-06", 2)).toBe(30)
  })

  it("treats missing dates as zero", () => {
    expect(sumRecentDays({}, "2026-07-06", 7)).toBe(0)
  })
})

describe("isNextDay", () => {
  it("is true for consecutive calendar days", () => {
    expect(isNextDay("2026-07-05", "2026-07-06")).toBe(true)
  })

  it("is true across a month boundary", () => {
    expect(isNextDay("2026-06-30", "2026-07-01")).toBe(true)
  })

  it("is false for the same day or a gap", () => {
    expect(isNextDay("2026-07-05", "2026-07-05")).toBe(false)
    expect(isNextDay("2026-07-04", "2026-07-06")).toBe(false)
  })
})
