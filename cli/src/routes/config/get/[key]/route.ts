import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"

const schema = z.object({})

export const help = `Usage: minion config get <key>

設定値を取得する。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const key = c.req.param("key") ?? ""
  return c.text(c.env.minion.config.get(key))
})
