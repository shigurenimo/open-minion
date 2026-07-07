// IO boundaries: each is an abstract class with a `Node*` (real runtime) and
// a `Memory*` (test double) implementation. Domain code receives these via
// constructor props and never touches `node:fs` / `Bun.spawn` / `Date.now()` /
// `Math.random()` / `WebSocket` directly.
//
//   import { MemoryMinionFileSystem } from "@shigureni/minion/boundaries"

// Error-as-value helpers — fallible operations return `T | Error`, never throw
export * from "./engine/errors"

export * from "./engine/fs/file-system"
export * from "./engine/fs/node-file-system"
export * from "./engine/fs/memory-file-system"
export * from "./engine/fs/json-file-store"

export * from "./engine/process/process-runner"
export * from "./engine/process/node-process-runner"
export * from "./engine/process/memory-process-runner"

export * from "./engine/time/clock"
export * from "./engine/time/node-clock"
export * from "./engine/time/memory-clock"

export * from "./engine/random/random-source"
export * from "./engine/random/node-random-source"
export * from "./engine/random/memory-random-source"

export * from "./engine/discord/websocket-factory"
export * from "./engine/discord/node-websocket-factory"
export * from "./engine/discord/memory-websocket-factory"
