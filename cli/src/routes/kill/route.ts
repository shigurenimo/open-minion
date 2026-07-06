import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"

const schema = z.object({})

export const help = `Usage: minion kill

アプリとgatewayを停止する。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  return c.text(c.env.minion.app.kill())
})
