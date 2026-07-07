import { factory } from "./factory.js";
import { onError } from "./on-error.js";
import configGet from "./routes/config/get/[key]/route.js";
import configList from "./routes/config/list/route.js";
import configSet from "./routes/config/set/[key]/[value]/route.js";
import dev from "./routes/dev/route.js";
import dex from "./routes/dex/route.js";
import discordStatus from "./routes/discord/status/route.js";
import kill from "./routes/kill/route.js";
import { createNotFound } from "./routes/not-found.js";
import reboot from "./routes/reboot/route.js";
import serve from "./routes/serve/route.js";
import start from "./routes/start/route.js";
import status from "./routes/status/route.js";
/** Every built-in command. Filter by `path` to drop one, or spread and append your own. */
export const DEFAULT_COMMANDS = [
    { path: "/start", handlers: start },
    { path: "/dev", handlers: dev },
    { path: "/dex", handlers: dex },
    { path: "/kill", handlers: kill },
    { path: "/reboot", handlers: reboot },
    { path: "/serve", handlers: serve },
    { path: "/status", handlers: status },
    { path: "/discord/status", handlers: discordStatus },
    { path: "/config/list", handlers: configList },
    { path: "/config/get/:key", handlers: configGet },
    { path: "/config/set/:key/:value", handlers: configSet },
];
/** Assembles the CLI's Hono app from a command table — the seam for adding, removing, or replacing commands. */
export function createMinionApp(options = {}) {
    const app = factory.createApp();
    app.onError(onError);
    app.notFound(createNotFound(options.usage));
    for (const command of options.commands ?? DEFAULT_COMMANDS) {
        app.on("POST", [command.path], ...command.handlers);
    }
    return app;
}
/** The default `minion` CLI app — what the published bin runs. */
export const app = createMinionApp();
