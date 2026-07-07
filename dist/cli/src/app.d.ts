import type { Hono } from "hono";
import { type Env } from "./factory.ts";
/**
 * One CLI command: `minion discord status` maps onto `path`
 * `"/discord/status"`, and `handlers` is the chain a route file's
 * `factory.createHandlers(...)` returns. Build custom commands with the same
 * `factory` / `helpGuard` / `bodyValidator` trio the built-ins use.
 */
export type MinionCliCommand = {
    path: string;
    handlers: readonly unknown[];
};
/** Every built-in command. Filter by `path` to drop one, or spread and append your own. */
export declare const DEFAULT_COMMANDS: MinionCliCommand[];
export type CreateMinionAppOptions = {
    /** Commands to mount. Defaults to `DEFAULT_COMMANDS`. */
    commands?: MinionCliCommand[];
    /** One-line usage shown on an unknown command. */
    usage?: string;
};
/** Assembles the CLI's Hono app from a command table — the seam for adding, removing, or replacing commands. */
export declare function createMinionApp(options?: CreateMinionAppOptions): Hono<Env>;
/** The default `minion` CLI app — what the published bin runs. */
export declare const app: Hono<Env, import("hono/types").BlankSchema, "/">;
