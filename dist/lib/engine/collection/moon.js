const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Days since the last new moon, in [0, ~29.53). A plain modulo over the mean
 * synodic month from a known new moon — the real phase drifts up to ~±1 day
 * from this because the lunar orbit is eccentric, which is why the phase
 * predicates below default to a ±1-day tolerance. Plenty for a toy.
 */
export function moonAgeDays(date) {
    const days = (date.getTime() - KNOWN_NEW_MOON_UTC_MS) / DAY_MS;
    const age = days % SYNODIC_MONTH_DAYS;
    return age < 0 ? age + SYNODIC_MONTH_DAYS : age;
}
/** Within `toleranceDays` of the (approximate) full moon. */
export function isFullMoon(date, toleranceDays = 1) {
    return Math.abs(moonAgeDays(date) - SYNODIC_MONTH_DAYS / 2) <= toleranceDays;
}
/** Within `toleranceDays` of the (approximate) new moon. */
export function isNewMoon(date, toleranceDays = 1) {
    const age = moonAgeDays(date);
    return age <= toleranceDays || age >= SYNODIC_MONTH_DAYS - toleranceDays;
}
