import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"

const schema = z.strictObject({})

export const help = `Usage: minion config list

設定値を一覧表示する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const config = c.env.minion.config.list()
  const lines = Object.entries(config).map(([k, v]) => `${k} = ${v}`)
  return c.text(lines.join("\n"))
})
