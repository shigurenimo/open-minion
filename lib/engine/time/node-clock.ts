import { MinionClock } from "./clock"

export class NodeMinionClock extends MinionClock {
  now(): Date {
    return new Date()
  }
}
