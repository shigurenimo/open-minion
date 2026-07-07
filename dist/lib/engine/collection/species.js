import { isFullMoon, isNewMoon } from "./moon.js";
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
export const DEFAULT_MINION_SPECIES = [
    {
        id: "zorome",
        name: "ゾロめミニオン",
        rarity: "rare",
        description: "時計が11:11か22:22を指す瞬間だけ現れる。",
        condition: (s) => {
            const minute = s.now.getMinutes();
            return (s.hour === 11 && minute === 11) || (s.hour === 22 && minute === 22);
        },
    },
    {
        id: "full-moon",
        name: "まんげつミニオン",
        rarity: "rare",
        description: "満月の夜(20時〜5時)に現れる。",
        condition: (s) => isFullMoon(s.now) && (s.timeBucket === "night" || s.timeBucket === "lateNight"),
    },
    {
        id: "new-moon",
        name: "しんげつミニオン",
        rarity: "rare",
        description: "新月の深夜、月のない暗い夜に現れる。",
        condition: (s) => isNewMoon(s.now) && s.timeBucket === "lateNight",
    },
    {
        id: "mega-swarm",
        name: "だいぐんせいミニオン",
        rarity: "rare",
        description: "同時に10以上のセッションが動く修羅場に現れる。",
        condition: (s) => s.currentConcurrentSessions >= 10,
    },
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
        id: "morning-active",
        name: "あさかつミニオン",
        rarity: "rare",
        description: "朝(5時〜10時)にセッションを動かしていると現れる。",
        condition: (s) => s.timeBucket === "morning" && s.currentConcurrentSessions >= 1,
    },
    {
        id: "lunch-break",
        name: "おひるミニオン",
        rarity: "rare",
        description: "お昼(12時台)にセッションを動かしていると現れる。",
        condition: (s) => s.hour === 12 && s.currentConcurrentSessions >= 1,
    },
    {
        id: "twins",
        name: "ふたごミニオン",
        rarity: "rare",
        description: "同時に2つのセッションが動いていると現れる。",
        condition: (s) => s.currentConcurrentSessions >= 2,
    },
    {
        id: "legend",
        name: "でんせつミニオン",
        rarity: "rare",
        description: "累計1億トークンを消費したでんせつのもとに現れる。",
        condition: (s) => s.tokensTotal >= 100_000_000,
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
        id: "glutton",
        name: "おおぐいミニオン",
        rarity: "rare",
        description: "1日で30万トークンを消費すると現れる。",
        condition: (s) => s.tokensToday >= 300_000,
    },
    {
        id: "perfect-attendance",
        name: "かいきんミニオン",
        rarity: "rare",
        description: "30日連続でセッションを実行していると現れる。",
        condition: (s) => s.currentStreakDays >= 30,
    },
    {
        id: "marathon",
        name: "マラソンミニオン",
        rarity: "rare",
        description: "7日連続でセッションを実行していると現れる。",
        condition: (s) => s.currentStreakDays >= 7,
    },
    {
        id: "three-day-streak",
        name: "みっかミニオン",
        rarity: "rare",
        description: "3日連続でセッションを実行していると現れる。みっかぼうず卒業。",
        condition: (s) => s.currentStreakDays >= 3,
    },
    {
        id: "month-end",
        name: "しめきりミニオン",
        rarity: "rare",
        description: "月末の日に現れる。しめきりは大丈夫?",
        condition: (s) => new Date(s.now.getFullYear(), s.now.getMonth(), s.now.getDate() + 1).getDate() === 1,
    },
    {
        id: "friday-night",
        name: "きんようミニオン",
        rarity: "rare",
        description: "金曜の夜(20時〜24時)にセッションを動かしていると現れる。",
        condition: (s) => s.now.getDay() === 5 && s.timeBucket === "night" && s.currentConcurrentSessions >= 1,
    },
    {
        id: "sunday-worker",
        name: "にちようミニオン",
        rarity: "rare",
        description: "日曜にセッションを動かしていると現れる。",
        condition: (s) => s.now.getDay() === 0 && s.currentConcurrentSessions >= 1,
    },
    {
        id: "devoted",
        name: "いちずミニオン",
        rarity: "rare",
        description: "累計50セッションを超えてもプロジェクトがひとつだけだと現れる。",
        condition: (s) => s.uniqueProjectsSeen === 1 && s.totalSessionsSeen >= 50,
    },
    {
        id: "wanderer",
        name: "ほうろうミニオン",
        rarity: "rare",
        description: "10個以上の異なるプロジェクトを渡り歩くと現れる。",
        condition: (s) => s.uniqueProjectsSeen >= 10,
    },
    {
        id: "juggler",
        name: "かけもちミニオン",
        rarity: "rare",
        description: "3つ以上のプロジェクトをかけもちすると現れる。",
        condition: (s) => s.uniqueProjectsSeen >= 3,
    },
    {
        id: "veteran",
        name: "ベテランミニオン",
        rarity: "rare",
        description: "累計100セッションを超えたころに現れる。",
        condition: (s) => s.totalSessionsSeen >= 100,
    },
    {
        id: "rookie",
        name: "ひよこミニオン",
        rarity: "rare",
        description: "累計10セッションを実行したかけだしに現れる。",
        condition: (s) => s.totalSessionsSeen >= 10,
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
];
/**
 * The species that manifests right now, per `stats`. Checks `catalog` in
 * order and returns the first match — defaults to `DEFAULT_MINION_SPECIES`,
 * whose time-of-day commons cover every hour so it always resolves. A custom
 * catalog must include an unconditional (or otherwise fully-covering)
 * fallback entry, or this returns an Error when nothing matches.
 */
export function resolveSpecies(stats, catalog = DEFAULT_MINION_SPECIES) {
    const found = catalog.find((species) => species.condition(stats));
    if (!found) {
        return new Error("no minion species matched — the catalog needs a fully-covering fallback");
    }
    return found;
}
