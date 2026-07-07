import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { safeJsonParse } from "../../lib/engine/errors.js";
import { Minion } from "../../lib/minion.js";
import { app as defaultApp } from "./app.js";
import { postJson } from "./lib/post-json.js";
import { toRequest } from "./router.js";
export const DEFAULT_HELP = `minion - open-minion CLI

Usage:
  minion [command] [options]
  minion <command> -h          Show help for a command

Commands:
  start                     起動する (すでに起動中なら何もしない)
  dev                       停止してデバッグビルドで起動し直す
  kill                      停止する
  reboot                    停止してリリースビルドで起動し直す (デフォルト)
  serve                     gateway を前面起動する (Windows など Swift アプリなし環境向け)
  status                    起動状況を表示する
  dex                       実績とミニオン図鑑を表示する
  discord status            Discord 連携の設定状況を表示する
  config list               設定値を一覧表示する
  config get <key>          設定値を取得する
  config set <key> <value>  設定値を書き込む

Global flags:
  -h, --help     Show help
  -v, --version  Show version`;
/**
 * Parses argv, routes it through the Hono app, prints the response, and sets
 * the exit code — the whole `minion` binary as one reusable function. A host
 * can swap any piece: its own `Minion` wiring, a `createMinionApp()` with
 * extra commands, different default behavior.
 */
export async function runMinionCli(options = {}) {
    const app = options.app ?? defaultApp;
    const help = options.help ?? DEFAULT_HELP;
    const argv = options.argv ?? process.argv.slice(2);
    const minion = options.minion ??
        new Minion({
            onEvent: (event) => {
                if (event.type === "build-start")
                    console.log("ビルド中...");
            },
        });
    const env = { minion };
    // 引数なしはデフォルトコマンド (通常 reboot = 止めて起動し直す) に落とす。
    const args = argv.length === 0 ? (options.defaultArgs ?? ["reboot"]) : argv;
    const request = toRequest(args);
    if (request.global.version) {
        console.log(options.version ?? packageVersion());
        return;
    }
    if (request.global.help) {
        if (request.path === "/") {
            console.log(help);
            return;
        }
        const helpResponse = await app.request(request.path, postJson({ ...request.body, help: "true" }), env);
        console.log(helpResponse.ok ? await helpResponse.text() : help);
        return;
    }
    try {
        const response = await app.request(request.path, postJson(request.body), env);
        const text = await response.text();
        if (!response.ok) {
            console.error(text || `Error ${response.status}`);
            process.exitCode = 1;
            return;
        }
        console.log(text);
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(error.message);
        process.exitCode = 1;
    }
}
// TS ソース実行時と dist 実行時で package.json への相対位置が変わるため、
// 自身の場所から一番近い package.json まで遡って version を読む。
function packageVersion() {
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let depth = 0; depth < 10; depth++) {
        const candidate = join(dir, "package.json");
        if (existsSync(candidate)) {
            const parsed = safeJsonParse(readFileSync(candidate, "utf8"));
            if (!(parsed instanceof Error) && typeof parsed === "object" && parsed !== null) {
                const version = parsed.version;
                if (typeof version === "string")
                    return version;
            }
            return "0.0.0";
        }
        const parent = dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return "0.0.0";
}
