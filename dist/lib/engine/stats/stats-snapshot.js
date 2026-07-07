/**
 * Buckets an hour-of-day (0-23, local time) into one of five time-of-day
 * windows. Covers every hour exactly once, so `resolveSpecies` always has a
 * fallback time-of-day species to match against.
 */
export function timeBucketForHour(hour) {
    if (hour < 5)
        return "lateNight"; // 0-4
    if (hour < 10)
        return "morning"; // 5-9
    if (hour < 17)
        return "day"; // 10-16
    if (hour < 20)
        return "evening"; // 17-19
    return "night"; // 20-23
}
