import { z } from "zod"
import { factory } from "@/factory"
import { bodyValidator } from "@/lib/body-validator"
import { formatKillResult, formatStartResult, isStartError } from "@/lib/format"
import { helpGuard } from "@/lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion dev

一旦停止してから、デバッグビルドで起動し直す。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const killResult = c.env.minion.app.kill()
  if (killResult instanceof Error) return c.text(killResult.message, 500)
  // 何も止めていないときは kill の行を出さず、起動結果だけを表示する。
  const killLine = killResult.kind === "killed" ? [formatKillResult(killResult)] : []
  const startResult = await c.env.minion.app.start({ debug: true })
  if (startResult instanceof Error) {
    return c.text([...killLine, startResult.message].join("\n"), 500)
  }
  const text = [...killLine, formatStartResult(startResult)].join("\n")
  return c.text(text, isStartError(startResult) ? 500 : 200)
})
