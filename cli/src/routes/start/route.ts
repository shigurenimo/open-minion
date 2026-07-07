import { z } from "zod"
import { factory } from "@/factory"
import { bodyValidator } from "@/lib/body-validator"
import { formatStartResult, isStartError } from "@/lib/format"
import { helpGuard } from "@/lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion start

アプリをリリースビルドで起動する。すでに起動中なら何もしない。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const result = await c.env.minion.app.start()
  if (result instanceof Error) return c.text(result.message, 500)
  return c.text(formatStartResult(result), isStartError(result) ? 500 : 200)
})
