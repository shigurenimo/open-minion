import { z } from "zod"
import { factory } from "../../factory"
import { bodyValidator } from "../../lib/body-validator"
import { helpGuard } from "../../lib/help-guard"

const schema = z.strictObject({
  port: z.string().regex(/^\d+$/, "--port は数値で指定してください").optional(),
})

export const help = `Usage: minion serve [--port <port>]

gateway をこのプロセスで前面起動する (Ctrl+C で停止)。
Swift アプリをビルドしない環境 (Windows など) で、Electron 等の
外部クライアントに ws://127.0.0.1:4756/ws を提供するために使う。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const body = c.req.valid("json")
  const port = body.port === undefined ? undefined : Number(body.port)

  const handle = c.env.minion.gatewayServer({ port }).start()
  if (handle instanceof Error) {
    return c.text(`gateway の起動に失敗しました: ${handle.message}`, 500)
  }

  // Bun.serve と tick タイマーがイベントループを維持するので、応答を返した後も
  // プロセスは生き続ける (Ctrl+C で終了)。
  return c.text(`gateway をポート ${handle.port} で起動しました (Ctrl+C で停止)`)
})
