import { MinionRandomSource } from "@/lib/engine/random/random-source.ts"

type Props = {
  /** Values replayed in order, then repeated from the start once exhausted. Defaults to always `0`. */
  values?: number[]
}

export class MemoryMinionRandomSource extends MinionRandomSource {
  private readonly values: number[]
  private index = 0

  constructor(props: Props = {}) {
    super()
    this.values = props.values && props.values.length > 0 ? props.values : [0]
  }

  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0
    this.index += 1
    return value
  }
}
