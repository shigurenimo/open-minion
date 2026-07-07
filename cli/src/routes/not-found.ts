import type { NotFoundHandler } from "hono"

export const DEFAULT_USAGE = "minion [start|dev|kill|reboot|serve|status|dex|discord|config]"

/** 404 handler showing a one-line usage. Pass your own `usage` when assembling a custom CLI. */
export function createNotFound(usage: string = DEFAULT_USAGE): NotFoundHandler {
  return (c) => {
    return c.text(`使い方: ${usage}\n不明なコマンド: ${c.req.path}`, 404)
  }
}
