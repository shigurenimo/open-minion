import type { NotFoundHandler } from "hono";
export declare const DEFAULT_USAGE = "minion [start|dev|kill|reboot|serve|status|dex|discord|config]";
/** 404 handler showing a one-line usage. Pass your own `usage` when assembling a custom CLI. */
export declare function createNotFound(usage?: string): NotFoundHandler;
