import type { StatsSnapshot } from "../stats/stats-snapshot"

export type Achievement = {
  id: string
  name: string
  description: string
  condition: (stats: StatsSnapshot) => boolean
  /**
   * Opaque reference to this achievement's badge art. Same contract as
   * `MinionSpecies.asset` — carried through untouched, `undefined` by
   * default. Pass your own catalog (see `MinionCollectionTracker`'s
   * `achievements` prop) to fill it in.
   */
  asset?: string
}

/**
 * The built-in achievement catalog. Only the default — pass a custom
 * `achievements` array to `MinionCollectionTracker` (or `Minion`) to replace
 * it entirely.
 */
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-session",
    name: "はじめの一歩",
    description: "はじめてセッションを実行した。",
    condition: (s) => s.totalSessionsSeen >= 1,
  },
  {
    id: "sessions-10",
    name: "駆け出し",
    description: "累計10セッションを実行した。",
    condition: (s) => s.totalSessionsSeen >= 10,
  },
  {
    id: "sessions-100",
    name: "常連",
    description: "累計100セッションを実行した。",
    condition: (s) => s.totalSessionsSeen >= 100,
  },
  {
    id: "sessions-1000",
    name: "生粋のヘビーユーザー",
    description: "累計1000セッションを実行した。",
    condition: (s) => s.totalSessionsSeen >= 1000,
  },
  {
    id: "concurrent-3",
    name: "マルチタスカー",
    description: "同時に3つのセッションを動かした。",
    condition: (s) => s.maxConcurrentSessions >= 3,
  },
  {
    id: "concurrent-5",
    name: "並列処理の鬼",
    description: "同時に5つのセッションを動かした。",
    condition: (s) => s.maxConcurrentSessions >= 5,
  },
  {
    id: "concurrent-10",
    name: "オーケストレーター",
    description: "同時に10のセッションを動かした。",
    condition: (s) => s.maxConcurrentSessions >= 10,
  },
  {
    id: "early-bird",
    name: "早起き",
    description: "朝(5時〜10時)にセッションを実行した。",
    condition: (s) => s.timeBucket === "morning",
  },
  {
    id: "night-owl",
    name: "夜ふかし",
    description: "夜(20時〜24時)にセッションを実行した。",
    condition: (s) => s.timeBucket === "night",
  },
  {
    id: "midnight-coder",
    name: "深夜コーダー",
    description: "深夜(0時〜5時)にセッションを実行した。",
    condition: (s) => s.timeBucket === "lateNight",
  },
  {
    id: "streak-7",
    name: "一週間皆勤",
    description: "7日連続でセッションを実行した。",
    condition: (s) => s.longestStreakDays >= 7,
  },
  {
    id: "streak-30",
    name: "一ヶ月皆勤",
    description: "30日連続でセッションを実行した。",
    condition: (s) => s.longestStreakDays >= 30,
  },
  {
    id: "projects-5",
    name: "多趣味",
    description: "5つの異なるプロジェクトで実行した。",
    condition: (s) => s.uniqueProjectsSeen >= 5,
  },
  {
    id: "projects-20",
    name: "プロジェクトホッパー",
    description: "20の異なるプロジェクトで実行した。",
    condition: (s) => s.uniqueProjectsSeen >= 20,
  },
  {
    id: "tokens-100k",
    name: "駆け出しの消費者",
    description: "累計10万トークンを消費した。",
    condition: (s) => s.tokensTotal >= 100_000,
  },
  {
    id: "tokens-1m",
    name: "百万トークン",
    description: "累計100万トークンを消費した。",
    condition: (s) => s.tokensTotal >= 1_000_000,
  },
  {
    id: "tokens-10m",
    name: "千万トークン",
    description: "累計1000万トークンを消費した。",
    condition: (s) => s.tokensTotal >= 10_000_000,
  },
  {
    id: "tokens-100m",
    name: "億トークン",
    description: "累計1億トークンを消費した。",
    condition: (s) => s.tokensTotal >= 100_000_000,
  },
  {
    id: "daily-million",
    name: "一日で百万トークン",
    description: "1日で100万トークンを消費した。",
    condition: (s) => s.tokensToday >= 1_000_000,
  },
  {
    id: "weekly-million",
    name: "週間百万トークン",
    description: "1週間で100万トークンを消費した。",
    condition: (s) => s.tokensThisWeek >= 1_000_000,
  },
]
