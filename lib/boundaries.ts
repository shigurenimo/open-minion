// IO boundaries: each is an abstract class with a `Node*` (real runtime) and
// a `Memory*` (test double) implementation. Domain code receives these via
// constructor props and never touches `node:fs` / `node:child_process` / `Date.now()` /
// `Math.random()` / `WebSocket` directly.
//
//   import { MemoryMinionFileSystem } from "@shigureni/minion/boundaries"

// Error-as-value helpers — fallible operations return `T | Error`, never throw
export * from "./engine/errors.ts"

export * from "./engine/fs/file-system.ts"
export * from "./engine/fs/node-file-system.ts"
export * from "./engine/fs/memory-file-system.ts"
export * from "./engine/fs/json-file-store.ts"

export * from "./engine/process/process-runner.ts"
export * from "./engine/process/node-process-runner.ts"
export * from "./engine/process/memory-process-runner.ts"

export * from "./engine/time/clock.ts"
export * from "./engine/time/node-clock.ts"
export * from "./engine/time/memory-clock.ts"

export * from "./engine/random/random-source.ts"
export * from "./engine/random/node-random-source.ts"
export * from "./engine/random/memory-random-source.ts"

export * from "./engine/discord/websocket-factory.ts"
export * from "./engine/discord/node-websocket-factory.ts"
export * from "./engine/discord/memory-websocket-factory.ts"
