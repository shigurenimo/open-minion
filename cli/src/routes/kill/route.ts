import { z } from "zod"
import { factory } from "@/factory"
import { bodyValidator } from "@/lib/body-validator"
import { formatKillResult } from "@/lib/format"
import { helpGuard } from "@/lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion kill

アプリとgatewayを停止する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const result = c.env.minion.app.kill()
  if (result instanceof Error) return c.text(result.message, 500)
  return c.text(formatKillResult(result))
})
