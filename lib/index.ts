// Public API surface for the @shigureni/minion package.
//
// This is the programmable counterpart to the `minion` CLI — the CLI (cli/)
// is a thin Hono-routed consumer of the same `Minion` facade exported here.
//
//   import { Minion } from "@shigureni/minion"
//
//   const minion = new Minion()
//   console.log(await minion.app.start(false))
//   console.log(minion.app.status())
//
// Pass `Minion.inMemory()` to get a fully sandboxed instance (no real disk,
// processes, or wall-clock time) for tests or ad-hoc experiments.

// Facade
export * from "@lib/minion"

// App — build/start/kill/status for the Swift app + gateway daemon
export * from "@lib/engine/app/app-paths"
export * from "@lib/engine/app/app-runner"
export * from "@lib/engine/app/source-hash"

// Config — flat string-keyed `config.json` store
export * from "@lib/engine/config/config-store"

// Gateway — session watching + pet behavior + the in-process HTTP/WS server
export * from "@lib/engine/gateway/sessions"
export * from "@lib/engine/gateway/pet-behavior"
export * from "@lib/engine/gateway/gateway-server"
export * from "@lib/engine/gateway/resolve-daemon-script"

// IO boundaries (abstract + Node / Memory implementations)
export * from "@lib/engine/fs/file-system"
export * from "@lib/engine/fs/node-file-system"
export * from "@lib/engine/fs/memory-file-system"

export * from "@lib/engine/process/process-runner"
export * from "@lib/engine/process/node-process-runner"
export * from "@lib/engine/process/memory-process-runner"

export * from "@lib/engine/time/clock"
export * from "@lib/engine/time/node-clock"
export * from "@lib/engine/time/memory-clock"

export * from "@lib/engine/random/random-source"
export * from "@lib/engine/random/node-random-source"
export * from "@lib/engine/random/memory-random-source"
