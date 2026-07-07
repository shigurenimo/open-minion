import type { Hono } from "hono";
import { Minion } from "../../lib/minion.ts";
import type { Env } from "./factory.ts";
export declare const DEFAULT_HELP = "minion - open-minion CLI\n\nUsage:\n  minion [command] [options]\n  minion <command> -h          Show help for a command\n\nCommands:\n  start                     \u8D77\u52D5\u3059\u308B (\u3059\u3067\u306B\u8D77\u52D5\u4E2D\u306A\u3089\u4F55\u3082\u3057\u306A\u3044)\n  dev                       \u505C\u6B62\u3057\u3066\u30C7\u30D0\u30C3\u30B0\u30D3\u30EB\u30C9\u3067\u8D77\u52D5\u3057\u76F4\u3059\n  kill                      \u505C\u6B62\u3059\u308B\n  reboot                    \u505C\u6B62\u3057\u3066\u30EA\u30EA\u30FC\u30B9\u30D3\u30EB\u30C9\u3067\u8D77\u52D5\u3057\u76F4\u3059 (\u30C7\u30D5\u30A9\u30EB\u30C8)\n  serve                     gateway \u3092\u524D\u9762\u8D77\u52D5\u3059\u308B (Windows \u306A\u3069 Swift \u30A2\u30D7\u30EA\u306A\u3057\u74B0\u5883\u5411\u3051)\n  status                    \u8D77\u52D5\u72B6\u6CC1\u3092\u8868\u793A\u3059\u308B\n  dex                       \u5B9F\u7E3E\u3068\u30DF\u30CB\u30AA\u30F3\u56F3\u9451\u3092\u8868\u793A\u3059\u308B\n  discord status            Discord \u9023\u643A\u306E\u8A2D\u5B9A\u72B6\u6CC1\u3092\u8868\u793A\u3059\u308B\n  config list               \u8A2D\u5B9A\u5024\u3092\u4E00\u89A7\u8868\u793A\u3059\u308B\n  config get <key>          \u8A2D\u5B9A\u5024\u3092\u53D6\u5F97\u3059\u308B\n  config set <key> <value>  \u8A2D\u5B9A\u5024\u3092\u66F8\u304D\u8FBC\u3080\n\nGlobal flags:\n  -h, --help     Show help\n  -v, --version  Show version";
export type RunMinionCliOptions = {
    /** The facade commands run against. Defaults to `new Minion()` with a build-progress logger. */
    minion?: Minion;
    /** The command app. Defaults to the built-in table — assemble your own with `createMinionApp()`. */
    app?: Hono<Env>;
    /** Defaults to `process.argv.slice(2)`. */
    argv?: string[];
    /** Top-level help (`minion -h`). Replace it when your command set differs. */
    help?: string;
    /** Shown by `-v`. Defaults to this package's version. */
    version?: string;
    /** Command used when invoked with no arguments. Defaults to `["reboot"]`. */
    defaultArgs?: string[];
};
/**
 * Parses argv, routes it through the Hono app, prints the response, and sets
 * the exit code — the whole `minion` binary as one reusable function. A host
 * can swap any piece: its own `Minion` wiring, a `createMinionApp()` with
 * extra commands, different default behavior.
 */
export declare function runMinionCli(options?: RunMinionCliOptions): Promise<void>;
