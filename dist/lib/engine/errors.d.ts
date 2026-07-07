/**
 * Error-as-value helpers. The library never throws across its public surface —
 * fallible operations return `T | Error`, checked with `instanceof Error`.
 * These helpers convert the throwing world (node:fs, node:http, JSON.parse) into
 * that convention at the boundary.
 */
/** Normalizes a caught value into an Error without losing the original message. */
export declare function toError(thrown: unknown): Error;
/** `JSON.parse` without the throw. JSON can never encode an `Error` instance, so `instanceof Error` cleanly separates failure. */
export declare function safeJsonParse(text: string): unknown;
