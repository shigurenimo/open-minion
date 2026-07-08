import { z } from "zod"
import { toError } from "@/lib/engine/errors.ts"
import { DEFAULT_GATEWAY_PORT } from "@/lib/engine/gateway/gateway-server.ts"
import type { PetSnapshotEntry } from "@/lib/engine/gateway/pet-behavior.ts"

/** The slice of `fetch` the probe needs — the runtime global satisfies it, and a test can hand in a stub. */
export type MinionFetch = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

const snapshotSchema = z.looseObject({
  sessions: z.array(
    z.looseObject({
      id: z.string(),
      state: z.enum(["running", "sleeping"]),
      clipIndex: z.number(),
      name: z.string().catch(""),
      activity: z.literal("gaming").optional().catch(undefined),
    }),
  ),
})

export type GatewaySnapshot = { sessions: PetSnapshotEntry[] }

type Props = {
  port?: number
  timeoutMs?: number
  /** Defaults to the runtime's global `fetch`. */
  fetchFn?: MinionFetch
}

/**
 * Reads a *running* gateway process's `/sessions` snapshot over HTTP —
 * unlike `MinionGatewayServer`, which is the in-process server itself.
 * Returns an Error when nothing is listening on the port, the response
 * isn't a snapshot, or the request times out.
 */
export async function readGatewaySnapshot(props: Props = {}): Promise<GatewaySnapshot | Error> {
  const port = props.port ?? DEFAULT_GATEWAY_PORT
  const fetchFn = props.fetchFn ?? fetch

  try {
    const res = await fetchFn(`http://127.0.0.1:${port}/sessions`, {
      signal: AbortSignal.timeout(props.timeoutMs ?? 1500),
    })
    if (!res.ok) return new Error(`gateway が異常応答を返しました (${res.status})`)

    const parsed = snapshotSchema.safeParse(await res.json())
    if (!parsed.success) return new Error("gateway の応答がスナップショット形式ではありません")
    return { sessions: parsed.data.sessions }
  } catch (thrown) {
    return toError(thrown)
  }
}
