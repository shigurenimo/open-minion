import { MinionClock } from "@/lib/engine/time/clock.ts"

export class NodeMinionClock extends MinionClock {
  now(): Date {
    return new Date()
  }
}
