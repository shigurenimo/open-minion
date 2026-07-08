// IO boundaries: each is an abstract class with a `Node*` (real runtime) and
// a `Memory*` (test double) implementation. Domain code receives these via
// constructor props and never touches `node:fs` / `node:child_process` / `Date.now()` /
// `Math.random()` / `WebSocket` directly.
//
//   import { MemoryMinionFileSystem } from "@shigureni/minion/boundaries"

// Error-as-value helpers — fallible operations return `T | Error`, never throw
export * from "@/lib/engine/errors.ts"

export * from "@/lib/engine/fs/file-system.ts"
export * from "@/lib/engine/fs/node-file-system.ts"
export * from "@/lib/engine/fs/memory-file-system.ts"
export * from "@/lib/engine/fs/json-file-store.ts"

export * from "@/lib/engine/process/process-runner.ts"
export * from "@/lib/engine/process/node-process-runner.ts"
export * from "@/lib/engine/process/memory-process-runner.ts"

export * from "@/lib/engine/time/clock.ts"
export * from "@/lib/engine/time/node-clock.ts"
export * from "@/lib/engine/time/memory-clock.ts"

export * from "@/lib/engine/random/random-source.ts"
export * from "@/lib/engine/random/node-random-source.ts"
export * from "@/lib/engine/random/memory-random-source.ts"

export * from "@/lib/engine/discord/websocket-factory.ts"
export * from "@/lib/engine/discord/node-websocket-factory.ts"
export * from "@/lib/engine/discord/memory-websocket-factory.ts"
