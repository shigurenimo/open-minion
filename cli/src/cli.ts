// Public entry for assembling the `minion` CLI — `@shigureni/minion/cli`.
//
// The published bin is just `runMinionCli()` with defaults. A host can
// rebuild it with its own commands and wiring:
//
//   import { Minion } from "@shigureni/minion"
//   import {
//     createMinionApp,
//     DEFAULT_COMMANDS,
//     factory,
//     helpGuard,
//     runMinionCli,
//   } from "@shigureni/minion/cli"
//
//   const party = factory.createHandlers(helpGuard("Usage: minion party"), (c) => {
//     return c.text("🎉")
//   })
//
//   await runMinionCli({
//     minion: new Minion({ petSources: [myOwnSource] }),
//     app: createMinionApp({
//       commands: [...DEFAULT_COMMANDS.filter((c) => c.path !== "/dex"), { path: "/party", handlers: party }],
//       usage: "minion [start|kill|party|...]",
//     }),
//   })

export {
  app,
  createMinionApp,
  DEFAULT_COMMANDS,
  type CreateMinionAppOptions,
  type MinionCliCommand,
} from "./app"
export { factory, type Env } from "./factory"
export { bodyValidator } from "./lib/body-validator"
export { helpGuard } from "./lib/help-guard"
export { postJson } from "./lib/post-json"
export { onError } from "./on-error"
export { toRequest } from "./router"
export { createNotFound, DEFAULT_USAGE } from "./routes/not-found"
export { DEFAULT_HELP, runMinionCli, type RunMinionCliOptions } from "./run"
