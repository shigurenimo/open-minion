import { MinionClock } from "@lib/engine/time/clock"

export class NodeMinionClock extends MinionClock {
  now(): Date {
    return new Date()
  }
}
