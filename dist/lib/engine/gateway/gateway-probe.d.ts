import type { PetSnapshotEntry } from "./pet-behavior.ts";
/** The slice of `fetch` the probe needs — the runtime global satisfies it, and a test can hand in a stub. */
export type MinionFetch = (url: string, init?: {
    signal?: AbortSignal;
}) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
}>;
export type GatewaySnapshot = {
    sessions: PetSnapshotEntry[];
};
type Props = {
    port?: number;
    timeoutMs?: number;
    /** Defaults to the runtime's global `fetch`. */
    fetchFn?: MinionFetch;
};
/**
 * Reads a *running* gateway process's `/sessions` snapshot over HTTP —
 * unlike `MinionGatewayServer`, which is the in-process server itself.
 * Returns an Error when nothing is listening on the port, the response
 * isn't a snapshot, or the request times out.
 */
export declare function readGatewaySnapshot(props?: Props): Promise<GatewaySnapshot | Error>;
export {};
