import { z } from "zod"
import { factory } from "../../../../../factory"
import { bodyValidator } from "../../../../../lib/body-validator"
import { helpGuard } from "../../../../../lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion config set <key> <value>

設定値を書き込む。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const key = c.req.param("key") ?? ""
  const value = c.req.param("value") ?? ""
  const setError = c.env.minion.config.set(key, value)
  if (setError) return c.text(setError.message, 500)
  return c.text(`${key} = ${value}`)
})
