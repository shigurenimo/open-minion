/**
 * Filesystem boundary used everywhere minion reads or writes.
 * Default is NodeMinionFileSystem (real `node:fs`); MemoryMinionFileSystem
 * provides a sandbox for tests and embedded use.
 *
 * Fallible operations return `T | Error` (checked with `instanceof Error`)
 * instead of throwing — implementations must catch their runtime's exceptions
 * at this boundary.
 */
export class MinionFileSystem {
}
