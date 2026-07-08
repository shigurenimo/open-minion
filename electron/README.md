# open-minion Electron クライアント (Windows)

gateway (`ws://127.0.0.1:4756/ws`) が配信するペットのスナップショットを、
透明・クリック透過のオーバーレイに描く Windows 用クライアント。ウィンドウは
Swift 版と同じく壁紙のすぐ上・他のウィンドウの背後に沈めてある
(`SetWindowPos(HWND_BOTTOM)`) ので、ブラウザ等の上には重ならない。
macOS 用の `swift/` と同じ役割で、行動の選択はすべて gateway 側が行う。

リポジトリ本体の依存を汚さないよう、独立した package.json を持つ。

## 起動

```sh
# 1. gateway を起動しておく
npx @shigureni/minion serve
# (リポジトリから動かすなら: bun cli/src/index.ts serve)

# 2. Electron クライアントを起動
cd electron
npm install
npm start   # prestart で スプライトのコピー + tsc ビルドが走る
```

終了はタスクトレイのひよこアイコン右クリック →「終了」。
(ウィンドウはクリック透過なので画面上からは閉じられない)

## Discord 連携

`~/.config/minion/config.json` に `discord.token` / `discord.guildId` が設定されていれば、
gateway が自動でフレンドのペットを配信してくる。セットアップ手順は
`minion discord status -h` または `.docs/discord.md` を参照。

- オンラインのフレンド → 動き回る
- オフライン → 退場する (表示されない)
- ゲームをプレイ中 → 座り込んで頭上に 🎮

## 実装メモ

- `src/renderer/clips.ts` のクリップ並び順は
  `lib/engine/gateway/pet-behavior.ts` の `ACTIONS` /
  `swift/.../open_minion.swift` の `PetView.clips` と3点同期必須。
- スプライト `ChickBlue.png` の正本は swift 側の Resources。ビルド時に
  `scripts/copy-assets.mjs` が `assets/` へコピーする (assets/ と dist/ は gitignore)。
- ペットへのホバーで名前ラベルを表示 (`setIgnoreMouseEvents(true, { forward: true })`
  によりマウス移動イベントだけがページへ届く)。ドラッグ・えさやりは未実装。
