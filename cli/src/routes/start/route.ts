import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"
import { startApp } from "@/lib/process"

const schema = z.object({})

export const help = `Usage: minion start

アプリをリリースビルドで起動する。すでに起動中なら何もしない。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const message = await startApp(false)
  return c.text(message)
})
