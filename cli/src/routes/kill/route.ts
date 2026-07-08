import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { formatKillResult } from "@/cli/src/lib/format.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion kill

アプリとgatewayを停止する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const result = c.env.minion.app.kill()
  if (result instanceof Error) return c.text(result.message, 500)
  return c.text(formatKillResult(result))
})
