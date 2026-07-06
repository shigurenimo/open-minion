import type { NotFoundHandler } from "hono"

export const notFound: NotFoundHandler = (c) => {
  return c.text(
    `使い方: minion [start|dev|kill|reboot|status|dex|config]\n不明なコマンド: ${c.req.path}`,
    404,
  )
}
