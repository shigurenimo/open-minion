// Public API surface for the @shigureni/minion package.
//
// This is the programmable counterpart to the `minion` CLI — the CLI (cli/)
// is a thin Hono-routed consumer of the same `Minion` facade exported here.
//
//   import { Minion } from "@shigureni/minion"
//
//   const minion = new Minion()
//   const result = await minion.app.start() // { kind: "started", pid: 123 } など
//   console.log(minion.app.status().app.running)
//
// Pass `Minion.inMemory()` to get a fully sandboxed instance (no real disk,
// processes, or wall-clock time) for tests or ad-hoc experiments.

// Facade
export * from "@lib/minion"

// Error-as-value helpers — fallible operations return `T | Error`, never throw
export * from "@lib/engine/errors"

// App — build/start/kill/status for the Swift app + gateway daemon
export * from "@lib/engine/app/app-paths"
export * from "@lib/engine/app/app-runner"
export * from "@lib/engine/app/source-hash"

// Config — flat string-keyed `config.json` store
export * from "@lib/engine/config/config-store"

// Gateway — session watching + pet behavior + the in-process HTTP/WS server
export * from "@lib/engine/gateway/sessions"
export * from "@lib/engine/gateway/pet-behavior"
export * from "@lib/engine/gateway/gateway-routes"
export * from "@lib/engine/gateway/gateway-server"
export * from "@lib/engine/gateway/resolve-daemon-script"

// Stats — session/token tracking feeding achievement + minion-species conditions
export * from "@lib/engine/stats/stats-snapshot"
export * from "@lib/engine/stats/session-stats-tracker"
export * from "@lib/engine/stats/token-usage-tracker"
export * from "@lib/engine/stats/stats-collector"

// Collection — the minion dex: rarity-tiered species + achievements, unlocked over time
export * from "@lib/engine/collection/moon"
export * from "@lib/engine/collection/species"
export * from "@lib/engine/collection/achievements"
export * from "@lib/engine/collection/collection-store"
export * from "@lib/engine/collection/collection-tracker"

// IO boundaries (abstract + Node / Memory implementations)
export * from "@lib/engine/fs/file-system"
export * from "@lib/engine/fs/node-file-system"
export * from "@lib/engine/fs/memory-file-system"
export * from "@lib/engine/fs/json-file-store"

export * from "@lib/engine/process/process-runner"
export * from "@lib/engine/process/node-process-runner"
export * from "@lib/engine/process/memory-process-runner"

export * from "@lib/engine/time/clock"
export * from "@lib/engine/time/node-clock"
export * from "@lib/engine/time/memory-clock"

export * from "@lib/engine/random/random-source"
export * from "@lib/engine/random/node-random-source"
export * from "@lib/engine/random/memory-random-source"
