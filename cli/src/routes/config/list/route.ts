import { z } from "zod"
import { factory } from "../../../factory"
import { bodyValidator } from "../../../lib/body-validator"
import { helpGuard } from "../../../lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion config list

設定値を一覧表示する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const config = c.env.minion.config.list()
  const lines = Object.entries(config).map(([k, v]) => `${k} = ${v}`)
  return c.text(lines.join("\n"))
})
