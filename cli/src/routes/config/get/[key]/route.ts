import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion config get <key>

設定値を取得する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const key = c.req.param("key") ?? ""
  const value = c.env.minion.config.get(key)
  if (value === undefined) return c.text(`未設定: ${key}`, 404)
  return c.text(value)
})
