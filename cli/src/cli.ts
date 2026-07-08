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
} from "@/cli/src/app.ts"
export { factory, type Env } from "@/cli/src/factory.ts"
export { bodyValidator } from "@/cli/src/lib/body-validator.ts"
export { helpGuard } from "@/cli/src/lib/help-guard.ts"
export { postJson } from "@/cli/src/lib/post-json.ts"
export { onError } from "@/cli/src/on-error.ts"
export { toRequest } from "@/cli/src/router.ts"
export { createNotFound, DEFAULT_USAGE } from "@/cli/src/routes/not-found.ts"
export { DEFAULT_HELP, runMinionCli, type RunMinionCliOptions } from "@/cli/src/run.ts"
