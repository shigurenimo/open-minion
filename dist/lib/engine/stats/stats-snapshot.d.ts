export type TimeBucket = "lateNight" | "morning" | "day" | "evening" | "night";
/**
 * Buckets an hour-of-day (0-23, local time) into one of five time-of-day
 * windows. Covers every hour exactly once, so `resolveSpecies` always has a
 * fallback time-of-day species to match against.
 */
export declare function timeBucketForHour(hour: number): TimeBucket;
export type StatsSnapshot = {
    now: Date;
    hour: number;
    timeBucket: TimeBucket;
    currentConcurrentSessions: number;
    maxConcurrentSessions: number;
    totalSessionsSeen: number;
    uniqueProjectsSeen: number;
    currentStreakDays: number;
    longestStreakDays: number;
    tokensTotal: number;
    /** Tokens consumed on `now`'s (UTC) calendar date. */
    tokensToday: number;
    /** Rolling 7-day sum ending on `now`'s (UTC) calendar date. */
    tokensThisWeek: number;
};
