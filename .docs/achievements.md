# 実績カタログ

正本: [`lib/engine/collection/achievements.ts`](../lib/engine/collection/achievements.ts) の `DEFAULT_ACHIEVEMENTS`。

## 解決ルール

- 種族と違い優先度はない。`minion dex` 実行時に条件を満たした実績はすべて解除され、`~/.minion/collection.json` に解除日時つきで永続化される。一度解除したら戻らない。
- 未解除の実績は名前だけ見え、説明が `???` になる(種族と逆で、名前がヒント)。
- カタログはDI可能: `new Minion({ achievements })` で丸ごと差し替え。

## 一覧

### セッション数(累計)

- `first-session` — はじめの一歩(1セッション)
- `sessions-10` — 駆け出し(10セッション)
- `sessions-100` — 常連(100セッション)
- `sessions-1000` — 生粋のヘビーユーザー(1000セッション)

### 同時実行(最高記録)

- `concurrent-3` — マルチタスカー(同時3)
- `concurrent-5` — 並列処理の鬼(同時5)
- `concurrent-10` — オーケストレーター(同時10)

### 時間帯

- `early-bird` — 早起き(朝5時〜10時に実行)
- `night-owl` — 夜ふかし(夜20時〜24時に実行)
- `midnight-coder` — 深夜コーダー(深夜0時〜5時に実行)

### ストリーク(最長)

- `streak-7` — 一週間皆勤(7日連続)
- `streak-30` — 一ヶ月皆勤(30日連続)

### プロジェクト数

- `projects-5` — 多趣味(5プロジェクト)
- `projects-20` — プロジェクトホッパー(20プロジェクト)

### トークン消費

- `tokens-100k` — 駆け出しの消費者(累計10万)
- `tokens-1m` — 百万トークン(累計100万)
- `tokens-10m` — 千万トークン(累計1000万)
- `tokens-100m` — 億トークン(累計1億)
- `daily-million` — 一日で百万トークン(1日で100万)
- `weekly-million` — 週間百万トークン(7日間で100万)

備考: トークン系は「minion導入以降の積算」(7日バックフィル窓より古い履歴は数えない)。時間帯系は `minion dex` を叩いた瞬間の時間帯で判定される — セッションが動いている必要はない(種族側の `insomniac` / `morning-active` はセッション必須で、より厳しい)。
