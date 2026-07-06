import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"
import { readConfig } from "@/lib/process"

const schema = z.object({})

export const help = `Usage: minion config list

設定値を一覧表示する。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const config = readConfig()
  const lines = Object.entries(config).map(([k, v]) => `${k} = ${v}`)
  return c.text(lines.join("\n"))
})
