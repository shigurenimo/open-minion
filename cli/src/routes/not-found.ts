import type { NotFoundHandler } from "hono"

export const notFound: NotFoundHandler = (c) => {
  return c.text(
    `使い方: minion [start|dev|kill|reboot|serve|status|dex|discord|config]\n不明なコマンド: ${c.req.path}`,
    404,
  )
}
