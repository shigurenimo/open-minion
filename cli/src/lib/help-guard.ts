import type { MiddlewareHandler } from "hono"

// --help を zValidator より先に処理する。必須フィールドを持つコマンドでも
// `minion <command> --help` が検証エラー(400)で弾かれず help を返せるようにする。
export function helpGuard(help: string): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json().catch(() => null)

    if (body && typeof body === "object" && "help" in body && body.help) {
      return c.text(help)
    }

    await next()
  }
}
