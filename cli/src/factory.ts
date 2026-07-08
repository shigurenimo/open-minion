import { createFactory } from "hono/factory"
import type { Minion } from "@/lib/minion.ts"

export type Env = {
  Bindings: {
    minion: Minion
  }
}

export const factory = createFactory<Env>()
