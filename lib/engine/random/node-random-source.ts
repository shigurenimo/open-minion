import { MinionRandomSource } from "@lib/engine/random/random-source"

export class NodeMinionRandomSource extends MinionRandomSource {
  next(): number {
    return Math.random()
  }
}
