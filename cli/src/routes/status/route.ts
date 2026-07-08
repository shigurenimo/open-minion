import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { formatAppStatus } from "@/cli/src/lib/format.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion status

アプリとgatewayの起動状況を表示する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  return c.text(formatAppStatus(c.env.minion.app.status()))
})
