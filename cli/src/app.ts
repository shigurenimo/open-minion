import type { Hono } from "hono"
import type { H } from "hono/types"
import { type Env, factory } from "@/cli/src/factory.ts"
import { onError } from "@/cli/src/on-error.ts"
import configGet from "@/cli/src/routes/config/get/[key]/route.ts"
import configList from "@/cli/src/routes/config/list/route.ts"
import configSet from "@/cli/src/routes/config/set/[key]/[value]/route.ts"
import dev from "@/cli/src/routes/dev/route.ts"
import dex from "@/cli/src/routes/dex/route.ts"
import discordStatus from "@/cli/src/routes/discord/status/route.ts"
import kill from "@/cli/src/routes/kill/route.ts"
import { createNotFound } from "@/cli/src/routes/not-found.ts"
import reboot from "@/cli/src/routes/reboot/route.ts"
import serve from "@/cli/src/routes/serve/route.ts"
import start from "@/cli/src/routes/start/route.ts"
import status from "@/cli/src/routes/status/route.ts"

/**
 * One CLI command: `minion discord status` maps onto `path`
 * `"/discord/status"`, and `handlers` is the chain a route file's
 * `factory.createHandlers(...)` returns. Build custom commands with the same
 * `factory` / `helpGuard` / `bodyValidator` trio the built-ins use.
 */
export type MinionCliCommand = {
  path: string
  // ルートごとの入力(バリデーション)ジェネリクスは hono/zod-validator の分散の都合で
  // 共通の H 型に代入できないため、テーブル上では opaque に保ち、マウント時に復元する。
  handlers: readonly unknown[]
}

/** Every built-in command. Filter by `path` to drop one, or spread and append your own. */
export const DEFAULT_COMMANDS: MinionCliCommand[] = [
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
]

export type CreateMinionAppOptions = {
  /** Commands to mount. Defaults to `DEFAULT_COMMANDS`. */
  commands?: MinionCliCommand[]
  /** One-line usage shown on an unknown command. */
  usage?: string
}

/** Assembles the CLI's Hono app from a command table — the seam for adding, removing, or replacing commands. */
export function createMinionApp(options: CreateMinionAppOptions = {}): Hono<Env> {
  const app = factory.createApp()
  app.onError(onError)
  app.notFound(createNotFound(options.usage))

  for (const command of options.commands ?? DEFAULT_COMMANDS) {
    app.on("POST", [command.path], ...(command.handlers as H<Env>[]))
  }
  return app
}

/** The default `minion` CLI app — what the published bin runs. */
export const app = createMinionApp()
