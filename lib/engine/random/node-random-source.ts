import { MinionRandomSource } from "./random-source"

export class NodeMinionRandomSource extends MinionRandomSource {
  next(): number {
    return Math.random()
  }
}
