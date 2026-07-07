/** The `days` calendar dates ending on (and including) `todayIso`, in "YYYY-MM-DD" form, most-recent first. */
export declare function recentDates(todayIso: string, days: number): string[];
/** Sums a date-keyed map over the `days` calendar dates ending on `todayIso` (a rolling window, e.g. "this week" = 7). */
export declare function sumRecentDays(byDate: Record<string, number>, todayIso: string, days: number): number;
/** Whether `nextIso` is exactly the calendar day after `previousIso`. */
export declare function isNextDay(previousIso: string, nextIso: string): boolean;
