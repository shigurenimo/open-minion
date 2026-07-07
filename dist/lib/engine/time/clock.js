/**
 * Time boundary. Default NodeMinionClock returns `new Date()`; MemoryMinionClock
 * is settable and `advance(ms)`-able for deterministic session-staleness / tick tests.
 */
export class MinionClock {
    millis() {
        return this.now().getTime();
    }
}
