import { MinionClock } from "./clock.js";
export class MemoryMinionClock extends MinionClock {
    current;
    constructor(props = {}) {
        super();
        this.current = props.start ?? new Date(0);
    }
    now() {
        return new Date(this.current.getTime());
    }
    set(date) {
        this.current = date;
    }
    advance(ms) {
        this.current = new Date(this.current.getTime() + ms);
    }
}
