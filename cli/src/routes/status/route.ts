import { z } from "zod"
import { factory } from "../../factory.ts"
import { bodyValidator } from "../../lib/body-validator.ts"
import { formatAppStatus } from "../../lib/format.ts"
import { helpGuard } from "../../lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion status

アプリとgatewayの起動状況を表示する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  return c.text(formatAppStatus(c.env.minion.app.status()))
})
