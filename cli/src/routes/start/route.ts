import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { formatStartResult, isStartError } from "@/cli/src/lib/format.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion start

アプリをリリースビルドで起動する。すでに起動中なら何もしない。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const result = await c.env.minion.app.start()
  if (result instanceof Error) return c.text(result.message, 500)
  return c.text(formatStartResult(result), isStartError(result) ? 500 : 200)
})
