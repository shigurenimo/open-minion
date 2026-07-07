import { z } from "zod";
import { toError } from "../errors.js";
import { DEFAULT_GATEWAY_PORT } from "./gateway-server.js";
const snapshotSchema = z.looseObject({
    sessions: z.array(z.looseObject({
        id: z.string(),
        state: z.enum(["running", "sleeping"]),
        clipIndex: z.number(),
        name: z.string().catch(""),
        activity: z.literal("gaming").optional().catch(undefined),
    })),
});
/**
 * Reads a *running* gateway process's `/sessions` snapshot over HTTP —
 * unlike `MinionGatewayServer`, which is the in-process server itself.
 * Returns an Error when nothing is listening on the port, the response
 * isn't a snapshot, or the request times out.
 */
export async function readGatewaySnapshot(props = {}) {
    const port = props.port ?? DEFAULT_GATEWAY_PORT;
    const fetchFn = props.fetchFn ?? fetch;
    try {
        const res = await fetchFn(`http://127.0.0.1:${port}/sessions`, {
            signal: AbortSignal.timeout(props.timeoutMs ?? 1500),
        });
        if (!res.ok)
            return new Error(`gateway が異常応答を返しました (${res.status})`);
        const parsed = snapshotSchema.safeParse(await res.json());
        if (!parsed.success)
            return new Error("gateway の応答がスナップショット形式ではありません");
        return { sessions: parsed.data.sessions };
    }
    catch (thrown) {
        return toError(thrown);
    }
}
