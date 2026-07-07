import { MinionRandomSource } from "./random-source.js";
export class NodeMinionRandomSource extends MinionRandomSource {
    next() {
        return Math.random();
    }
}
