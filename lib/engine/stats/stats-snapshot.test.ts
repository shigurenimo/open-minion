import { describe, expect, it } from "vitest"
import { timeBucketForHour } from "./stats-snapshot"

describe("timeBucketForHour", () => {
  it("covers every hour of the day with exactly one bucket", () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(() => timeBucketForHour(hour)).not.toThrow()
    }
  })

  it.each([
    [0, "lateNight"],
    [4, "lateNight"],
    [5, "morning"],
    [9, "morning"],
    [10, "day"],
    [16, "day"],
    [17, "evening"],
    [19, "evening"],
    [20, "night"],
    [23, "night"],
  ])("buckets hour %i as %s", (hour, expected) => {
    expect(timeBucketForHour(hour)).toBe(expected)
  })
})
