import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { factory } from "@/factory"
import { helpGuard } from "@/lib/help-guard"

const schema = z.object({})

export const help = `Usage: minion reboot

一旦停止してから、リリースビルドで起動し直す。`

export default factory.createHandlers(helpGuard(help), zValidator("json", schema), async (c) => {
  const killMessage = c.env.minion.app.kill()
  const startMessage = await c.env.minion.app.start(false)
  return c.text([killMessage, startMessage].join("\n"))
})
