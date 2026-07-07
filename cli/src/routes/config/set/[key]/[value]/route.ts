import { z } from "zod"
import { factory } from "../../../../../factory"
import { bodyValidator } from "../../../../../lib/body-validator"
import { helpGuard } from "../../../../../lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion config set <key> <value>

設定値を書き込む (~/.config/minion/config.json)。

主なキー:
  claude.enabled    false で Claude Code セッションのペットを止める (デフォルト有効)
  discord.enabled   false で Discord 連携を止める (設定は残る)
  discord.token     Discord Bot トークン (guildId と両方あると自動で有効化)
  discord.guildId   監視する私設サーバーの ID
  discord.userIds   表示するメンバーの userId (カンマ区切り。未設定 = 全員)`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const key = c.req.param("key") ?? ""
  const value = c.req.param("value") ?? ""
  const setError = c.env.minion.config.set(key, value)
  if (setError) return c.text(setError.message, 500)
  return c.text(`${key} = ${value}`)
})
