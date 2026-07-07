# Discord 連携

フレンドの Discord プレゼンスをペットにする機能。オンラインのフレンドは動き回り、
ゲームをプレイ中なら座り込んで頭上に 🎮 が出る。オフラインのフレンドは表示されない。

コードの正本は `lib/engine/discord/`(取得側)と
`lib/engine/gateway/pet-source.ts`(gateway への合流点)。

## 仕組み(なぜ Bot + サーバー方式なのか)

Discord の規約上、ユーザーアカウントの自動化(セルフボット)は禁止、
フレンドリスト API(`relationships.read`)は個別承認制で個人アプリには使えない。
規約内でプレゼンスを取れる唯一の方法が **Bot を自分とフレンドの共有サーバーに置く**
方式(Lanyard と同じパターン):

- Bot は `GUILD_PRESENCES` + `GUILD_MEMBERS` 特権インテント(10,000 ユーザー未満なら
  Developer Portal のトグルだけで有効化可)で `PRESENCE_UPDATE` を受信する
- 見えるのは **その私設サーバーに参加しているメンバーだけ**。フレンド全員ではない
- メンバー一覧は接続時の GUILD_CREATE 基準(identify の `large_threshold: 250` まで)。
  **250 人を超えるギルド**では接続時にオフラインだったメンバーが一覧から欠け、
  その人は後からオンラインになっても再接続まで現れない。想定は小さい私設サーバー

## セットアップ

1. https://discord.com/developers/applications で New Application → Bot
2. Bot ページで **PRESENCE INTENT** と **SERVER MEMBERS INTENT** を ON
3. OAuth2 → URL Generator で scope `bot`(権限は不要。閲覧のみ)の招待 URL を作り、
   自分とフレンドが参加する私設サーバーに Bot を招待
4. 設定を書き込む:

   ```sh
   minion config set discord.token <Botトークン>
   minion config set discord.guildId <サーバーID>          # 開発者モードでサーバーを右クリック→IDコピー
   minion config set discord.userIds <userId,userId,...>   # 任意。未設定ならサーバーの全非Botメンバー
   ```

5. gateway を再起動(`minion reboot`、Windows は `minion serve` を起動し直す)。
   `minion discord status` で接続状態を確認できる。

## config キー

| キー              | 意味                                                      |
| ----------------- | --------------------------------------------------------- |
| `discord.token`   | Bot トークン。**これと guildId が両方あると自動で有効化** |
| `discord.guildId` | 監視する私設サーバーの ID                                 |
| `discord.userIds` | 表示するメンバーの userId(カンマ区切り)。未設定 = 全員    |

⚠️ トークンは `~/.minion/config.json` に **平文で保存される**。このファイルを
リポジトリにコミットしたり共有したりしないこと。漏れた場合は Developer Portal で
Regenerate する。

## データフロー

```
Discord Gateway WS (PRESENCE_UPDATE)
  → DiscordGatewayClient (identify/heartbeat/resume, lib/engine/discord/)
  → DiscordPresenceCache (純粋なイベント適用層)
  → DiscordPetSource.read() : Map<"discord:<userId>", SessionInfo>
  → gateway の tick で Claude Code セッションとマージ (pet-source.ts)
  → PetBehaviorEngine → WS スナップショット → 各レンダラー (swift/ / electron/)
```

- 状態変換: `online / idle / dnd → running`、`offline` はペットとして出さない
  (`read()` がスキップ)、activities に type 0 (Playing) があれば `activity: "gaming"`
- 切断中は最後の状態を保持し続ける(フレンドが一斉に消えたりしない)。
  接続エラーは `DiscordGatewayClient.lastError()` に残る

## WS プロトコル拡張(activity フィールド)

スナップショットの各エントリに optional な `activity` が増えた:

```json
{
  "sessions": [
    {
      "id": "discord:123",
      "state": "running",
      "clipIndex": 7,
      "name": "Alice",
      "activity": "gaming"
    }
  ]
}
```

`state` は従来どおり `"running" | "sleeping"` の2値のまま。未知フィールドを無視する
クライアント(既存の Swift 版)は無改修で動く。`activity` を読むクライアント
(electron/)だけがゲーム中演出を足せる。
