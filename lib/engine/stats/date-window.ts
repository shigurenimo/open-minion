const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Parses a "YYYY-MM-DD" string as a UTC-midnight instant. */
function parseIsoDate(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** The `days` calendar dates ending on (and including) `todayIso`, in "YYYY-MM-DD" form, most-recent first. */
export function recentDates(todayIso: string, days: number): string[] {
  const base = parseIsoDate(todayIso)
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    dates.push(new Date(base - i * MS_PER_DAY).toISOString().slice(0, 10))
  }
  return dates
}

/** Sums a date-keyed map over the `days` calendar dates ending on `todayIso` (a rolling window, e.g. "this week" = 7). */
export function sumRecentDays(
  byDate: Record<string, number>,
  todayIso: string,
  days: number,
): number {
  return recentDates(todayIso, days).reduce((sum, date) => sum + (byDate[date] ?? 0), 0)
}

/** Whether `nextIso` is exactly the calendar day after `previousIso`. */
export function isNextDay(previousIso: string, nextIso: string): boolean {
  return parseIsoDate(nextIso) - parseIsoDate(previousIso) === MS_PER_DAY
}
