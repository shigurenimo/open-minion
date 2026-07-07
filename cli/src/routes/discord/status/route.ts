import { z } from "zod"
import { DISCORD_PET_ID_PREFIX } from "../../../../../lib/engine/discord/discord-pet-source"
import type { Minion } from "../../../../../lib/minion"
import { factory } from "../../../factory"
import { bodyValidator } from "../../../lib/body-validator"
import { helpGuard } from "../../../lib/help-guard"

const schema = z.strictObject({})

export const help = `Usage: minion discord status

Discord 連携の設定状況と、gateway が見ているフレンドの状態を表示する。

セットアップ手順:
  1. https://discord.com/developers/applications で Bot を作成
  2. Bot ページで PRESENCE INTENT と SERVER MEMBERS INTENT を有効化
  3. 自分とフレンドが参加する私設サーバーに Bot を招待
  4. minion config set discord.token <Botトークン>
     minion config set discord.guildId <サーバーID>
     minion config set discord.userIds <userId,userId,...>   (任意・絞り込み)
  5. minion serve (または minion start) で gateway を再起動

設定を残したまま一時停止するには: minion config set discord.enabled false`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const config = c.env.minion.config
  const token = config.get("discord.token")
  const guildId = config.get("discord.guildId")
  const userIds = config.get("discord.userIds")

  const lines: string[] = []
  lines.push(`discord.token:   ${token ? maskToken(token) : "(未設定)"}`)
  lines.push(`discord.guildId: ${guildId ?? "(未設定)"}`)
  lines.push(`discord.userIds: ${userIds ?? "(未設定 = サーバーの全メンバー)"}`)

  if (config.get("discord.enabled") === "false") {
    lines.push("")
    lines.push(
      "Discord 連携は無効化されています (`minion config set discord.enabled true` で戻せます)。",
    )
    return c.text(lines.join("\n"))
  }

  if (!token || !guildId) {
    lines.push("")
    lines.push(
      "Discord 連携は無効です。`minion discord status -h` でセットアップ手順を表示します。",
    )
    return c.text(lines.join("\n"))
  }

  lines.push("")
  lines.push(await describeGateway(c.env.minion))
  return c.text(lines.join("\n"))
})

function maskToken(token: string): string {
  if (token.length <= 8) return "****"
  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

async function describeGateway(minion: Minion): Promise<string> {
  const snapshot = await minion.gatewaySnapshot()
  if (snapshot instanceof Error) {
    return "gateway: 停止中 (minion serve または minion start で起動できます)"
  }

  const pets = snapshot.sessions.filter((s) => s.id.startsWith(DISCORD_PET_ID_PREFIX))
  const running = pets.filter((s) => s.state === "running").length

  if (pets.length === 0) {
    return "gateway: 稼働中 / Discord のペットはまだいません (接続直後は数秒かかります。設定変更後は gateway の再起動が必要です)"
  }
  return `gateway: 稼働中 / Discord のペット ${pets.length} 体 (オンライン ${running} 体)`
}
