// IO boundaries: each is an abstract class with a `Node*` (real runtime) and
// a `Memory*` (test double) implementation. Domain code receives these via
// constructor props and never touches `node:fs` / `node:child_process` / `Date.now()` /
// `Math.random()` / `WebSocket` directly.
//
//   import { MemoryMinionFileSystem } from "@shigureni/minion/boundaries"
// Error-as-value helpers — fallible operations return `T | Error`, never throw
export * from "./engine/errors.js";
export * from "./engine/fs/file-system.js";
export * from "./engine/fs/node-file-system.js";
export * from "./engine/fs/memory-file-system.js";
export * from "./engine/fs/json-file-store.js";
export * from "./engine/process/process-runner.js";
export * from "./engine/process/node-process-runner.js";
export * from "./engine/process/memory-process-runner.js";
export * from "./engine/time/clock.js";
export * from "./engine/time/node-clock.js";
export * from "./engine/time/memory-clock.js";
export * from "./engine/random/random-source.js";
export * from "./engine/random/node-random-source.js";
export * from "./engine/random/memory-random-source.js";
export * from "./engine/discord/websocket-factory.js";
export * from "./engine/discord/node-websocket-factory.js";
export * from "./engine/discord/memory-websocket-factory.js";
