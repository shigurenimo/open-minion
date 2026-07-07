// Public API surface for the @shigureni/minion package — the batteries-included
// entry: the `Minion` facade plus every area re-exported.
//
//   import { Minion } from "@shigureni/minion"
//
//   const minion = new Minion()
//   const result = await minion.app.start() // { kind: "started", pid: 123 } など
//   console.log(minion.app.status().app.running)
//
// Pass `Minion.inMemory()` to get a fully sandboxed instance (no real disk,
// processes, or wall-clock time) for tests or ad-hoc experiments.
//
// Importing this entry pulls the whole library into a bundle. When composing
// your own pieces (a custom PetSource, a bare gateway, just the Discord
// client), import the area entry instead — each is a separate module graph:
//
//   @shigureni/minion/gateway     PetSource / PetBehaviorEngine / MinionGatewayServer
//   @shigureni/minion/discord     Discord presence source + raw Gateway WS client
//   @shigureni/minion/app         Swift app + daemon lifecycle, path layout
//   @shigureni/minion/stats       session/token stats
//   @shigureni/minion/collection  species + achievements (the dex)
//   @shigureni/minion/config      the config.json store
//   @shigureni/minion/boundaries  IO boundaries (fs/process/clock/random/ws) + Node/Memory impls
//   @shigureni/minion/cli         assemble the `minion` CLI with your own commands

// Facade
export * from "./minion.ts"

export * from "./boundaries.ts"
export * from "./config.ts"
export * from "./app.ts"
export * from "./gateway.ts"
export * from "./discord.ts"
export * from "./stats.ts"
export * from "./collection.ts"
