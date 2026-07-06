import type { StatsSnapshot } from "@lib/engine/stats/stats-snapshot"

export type MinionRarity = "common" | "rare"

export type MinionSpecies = {
  id: string
  name: string
  rarity: MinionRarity
  description: string
  condition: (stats: StatsSnapshot) => boolean
  /**
   * Opaque reference to this species' art (a sprite path, bundle key, URL —
   * whatever scheme the host app's renderer uses). This library never reads
   * or interprets it; it just carries it through `dex()` for a host to
   * consume. Left `undefined` in the built-in catalog — pass your own
   * catalog (see `MinionCollectionTracker`'s `species` prop) to fill it in.
   */
  asset?: string
}

/**
 * The built-in minion species catalog. `resolveSpecies` picks the first
 * entry whose condition matches, so order is priority: rare/specific
 * conditions are listed first, and the five time-of-day commons — which
 * together cover every hour — sit last as the guaranteed fallback.
 *
 * This is only the default; pass a custom `species` array to
 * `MinionCollectionTracker` (or `Minion`) to replace it entirely — e.g. to
 * add your own species, retheme the built-ins, or attach real `asset`
 * references once art exists.
 */
export const DEFAULT_MINION_SPECIES: MinionSpecies[] = [
  {
    id: "swarm",
    name: "ぐんせいミニオン",
    rarity: "rare",
    description: "同時に5つ以上のセッションが動いているときだけ現れる。",
    condition: (s) => s.currentConcurrentSessions >= 5,
  },
  {
    id: "overdrive",
    name: "オーバードライブミニオン",
    rarity: "rare",
    description: "同時に3つ以上のセッションが動いているときに現れる。",
    condition: (s) => s.currentConcurrentSessions >= 3,
  },
  {
    id: "insomniac",
    name: "ふみんミニオン",
    rarity: "rare",
    description: "深夜(0時〜5時)にセッションを動かしていると現れる。",
    condition: (s) => s.timeBucket === "lateNight" && s.currentConcurrentSessions >= 1,
  },
  {
    id: "torrent",
    name: "トレントミニオン",
    rarity: "rare",
    description: "1週間で500万トークンを消費すると現れる。",
    condition: (s) => s.tokensThisWeek >= 5_000_000,
  },
  {
    id: "golden",
    name: "こがねミニオン",
    rarity: "rare",
    description: "累計1000万トークンを消費した猛者に現れる。",
    condition: (s) => s.tokensTotal >= 10_000_000,
  },
  {
    id: "big-spender",
    name: "だいしょうひミニオン",
    rarity: "rare",
    description: "1日で100万トークンを消費すると現れる。",
    condition: (s) => s.tokensToday >= 1_000_000,
  },
  {
    id: "marathon",
    name: "マラソンミニオン",
    rarity: "rare",
    description: "7日連続でセッションを実行していると現れる。",
    condition: (s) => s.currentStreakDays >= 7,
  },
  {
    id: "wanderer",
    name: "ほうろうミニオン",
    rarity: "rare",
    description: "10個以上の異なるプロジェクトを渡り歩くと現れる。",
    condition: (s) => s.uniqueProjectsSeen >= 10,
  },
  {
    id: "veteran",
    name: "ベテランミニオン",
    rarity: "rare",
    description: "累計100セッションを超えたころに現れる。",
    condition: (s) => s.totalSessionsSeen >= 100,
  },
  {
    id: "late-night",
    name: "しんやミニオン",
    rarity: "common",
    description: "深夜(0時〜5時)に現れる。",
    condition: (s) => s.timeBucket === "lateNight",
  },
  {
    id: "morning",
    name: "あさミニオン",
    rarity: "common",
    description: "朝(5時〜10時)に現れる。",
    condition: (s) => s.timeBucket === "morning",
  },
  {
    id: "day",
    name: "ひなたミニオン",
    rarity: "common",
    description: "日中(10時〜17時)に現れる。",
    condition: (s) => s.timeBucket === "day",
  },
  {
    id: "evening",
    name: "ゆうやけミニオン",
    rarity: "common",
    description: "夕方(17時〜20時)に現れる。",
    condition: (s) => s.timeBucket === "evening",
  },
  {
    id: "night",
    name: "よふかしミニオン",
    rarity: "common",
    description: "夜(20時〜24時)に現れる。",
    condition: (s) => s.timeBucket === "night",
  },
]

/**
 * The species that manifests right now, per `stats`. Checks `catalog` in
 * order and returns the first match — defaults to `DEFAULT_MINION_SPECIES`,
 * whose time-of-day commons cover every hour so it always resolves. A custom
 * catalog must include an unconditional (or otherwise fully-covering)
 * fallback entry, or this throws when nothing matches.
 */
export function resolveSpecies(
  stats: StatsSnapshot,
  catalog: MinionSpecies[] = DEFAULT_MINION_SPECIES,
): MinionSpecies {
  const found = catalog.find((species) => species.condition(stats))
  if (!found) {
    throw new Error("no minion species matched — the catalog needs a fully-covering fallback")
  }
  return found
}
