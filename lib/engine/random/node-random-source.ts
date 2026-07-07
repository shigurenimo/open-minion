import { MinionRandomSource } from "./random-source.ts"

export class NodeMinionRandomSource extends MinionRandomSource {
  next(): number {
    return Math.random()
  }
}
