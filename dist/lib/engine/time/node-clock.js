import { MinionClock } from "./clock.js";
export class NodeMinionClock extends MinionClock {
    now() {
        return new Date();
    }
}
