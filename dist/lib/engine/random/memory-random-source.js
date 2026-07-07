import { MinionRandomSource } from "./random-source.js";
export class MemoryMinionRandomSource extends MinionRandomSource {
    values;
    index = 0;
    constructor(props = {}) {
        super();
        this.values = props.values && props.values.length > 0 ? props.values : [0];
    }
    next() {
        const value = this.values[this.index % this.values.length] ?? 0;
        this.index += 1;
        return value;
    }
}
