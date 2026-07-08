import { z } from "zod"
import { factory } from "@/cli/src/factory.ts"
import { bodyValidator } from "@/cli/src/lib/body-validator.ts"
import { helpGuard } from "@/cli/src/lib/help-guard.ts"
import type { MinionRarity } from "@/lib/engine/collection/species.ts"

const schema = z.strictObject({})

export const help = `Usage: minion dex

実績とミニオン図鑑を表示する。セッション数・同時実行数・時間帯・トークン消費量を
元に実績を解除し、条件を満たすと珍しいミニオンが出現する。`

export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
  const minion = c.env.minion
  const stats = minion.stats.collect()
  if (stats instanceof Error) return c.text(stats.message, 500)
  const evaluation = minion.collection.evaluate(stats)
  if (evaluation instanceof Error) return c.text(evaluation.message, 500)
  const dex = minion.collection.dex()

  const lines: string[] = []

  lines.push(
    `現在のミニオン: ${evaluation.species.name} (${rarityLabel(evaluation.species.rarity)})`,
  )

  const newlyUnlocked = evaluation.newlyUnlockedAchievements
  if (newlyUnlocked.length > 0) {
    lines.push("")
    lines.push("実績を解除した!")
    for (const a of newlyUnlocked) lines.push(`  ★ ${a.name} — ${a.description}`)
  }
  if (evaluation.newlyDiscoveredSpecies.length > 0) {
    lines.push("")
    for (const discovered of evaluation.newlyDiscoveredSpecies) {
      lines.push(`新しいミニオンを発見した! ${discovered.name} (${rarityLabel(discovered.rarity)})`)
    }
  }

  const unlockedCount = dex.achievements.filter((a) => a.unlocked).length
  lines.push("")
  lines.push(`== 実績 (${unlockedCount}/${dex.achievements.length}) ==`)
  for (const a of dex.achievements) {
    const mark = a.unlocked ? "[x]" : "[ ]"
    const detail = a.unlocked ? a.description : "???"
    lines.push(`${mark} ${a.name} — ${detail}`)
  }

  const discoveredCount = dex.species.filter((s) => s.discovered).length
  lines.push("")
  lines.push(`== ミニオン図鑑 (${discoveredCount}/${dex.species.length}) ==`)
  for (const s of dex.species) {
    const mark = s.discovered ? "[x]" : "[ ]"
    const label = s.discovered
      ? `${s.name} (${rarityLabel(s.rarity)}) — ${s.description}`
      : `??? (${rarityLabel(s.rarity)})`
    lines.push(`${mark} ${label}`)
  }

  return c.text(lines.join("\n"))
})

function rarityLabel(rarity: MinionRarity): string {
  return rarity === "rare" ? "レア" : "コモン"
}
