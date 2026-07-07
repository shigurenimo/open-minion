/**
 * Days since the last new moon, in [0, ~29.53). A plain modulo over the mean
 * synodic month from a known new moon — the real phase drifts up to ~±1 day
 * from this because the lunar orbit is eccentric, which is why the phase
 * predicates below default to a ±1-day tolerance. Plenty for a toy.
 */
export declare function moonAgeDays(date: Date): number;
/** Within `toleranceDays` of the (approximate) full moon. */
export declare function isFullMoon(date: Date, toleranceDays?: number): boolean;
/** Within `toleranceDays` of the (approximate) new moon. */
export declare function isNewMoon(date: Date, toleranceDays?: number): boolean;
