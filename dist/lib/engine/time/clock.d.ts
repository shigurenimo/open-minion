/**
 * Time boundary. Default NodeMinionClock returns `new Date()`; MemoryMinionClock
 * is settable and `advance(ms)`-able for deterministic session-staleness / tick tests.
 */
export declare abstract class MinionClock {
    abstract now(): Date;
    millis(): number;
}
