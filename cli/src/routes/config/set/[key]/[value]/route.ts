import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"

const schema = z.object({})

export const help = `Usage: minion config set <key> <value>

設定値を書き込む。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const key = c.req.param("key") ?? ""
  const value = c.req.param("value") ?? ""
  c.env.minion.config.set(key, value)
  return c.text(`${key} = ${value}`)
})
