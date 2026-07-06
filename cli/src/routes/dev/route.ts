import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"
import { killApp, startApp } from "@/lib/process"

const schema = z.object({})

export const help = `Usage: minion dev

一旦停止してから、デバッグビルドで起動し直す。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const killMessage = killApp()
  const startMessage = await startApp(true)
  return c.text([killMessage, startMessage].join("\n"))
})
