/**
 * Process boundary covering foreground builds, detached background spawns,
 * and liveness checks. Default is NodeMinionProcessRunner (node:child_process);
 * MemoryMinionProcessRunner records calls and lets tests stub responses.
 *
 * Fallible operations return `T | Error` (e.g. the executable doesn't exist)
 * instead of throwing — implementations must catch their runtime's exceptions
 * at this boundary.
 */
export class MinionProcessRunner {
}
