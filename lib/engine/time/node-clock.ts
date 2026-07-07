import { MinionClock } from "./clock.ts"

export class NodeMinionClock extends MinionClock {
  now(): Date {
    return new Date()
  }
}
