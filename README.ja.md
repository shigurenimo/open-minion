# minion(日本語ガイド)

デスクトップの上を歩き回る小さなペットです。あなたの
[Claude Code](https://claude.com/claude-code) のセッションに反応して、Claude が
作業中は走り回り、何もしていないときは寝ます。さらに Discord のフレンドを
ペットとして呼び出すこともできます(オンラインの間だけ現れて動き回り、
ゲーム中は 🎮 を出して座り込みます。オフラインになると退場します)。

ペットは常に他のウィンドウの背後(壁紙のすぐ上)にいます。ブラウザや
エディタの上に重なって邪魔をすることはありません。

## macOS で動かす

必要なもの: [Node.js](https://nodejs.org) 22+、Xcode Command Line Tools(`xcode-select --install`)

```sh
npx @shigureni/minion
```

初回はペットのコンパイルに1分ほどかかります。以降の起動はビルドを再利用します。

`minion` コマンドを常用するなら:

```sh
npm install -g @shigureni/minion
minion
```

## Windows で動かす

Swift 製のオーバーレイは macOS 専用なので、Windows では gateway(サーバー)と
Electron クライアントの2つを起動します。必要なものは [Node.js](https://nodejs.org) 22+ だけです。

```sh
# ターミナル1: gateway を起動
npx @shigureni/minion serve

# ターミナル2: ペットの描画クライアントを起動 (リポジトリの electron/ で)
cd electron
npm install   # 初回のみ
npm start
```

ひよこがデスクトップに現れます。終了するにはタスクトレイのひよこアイコンを
右クリック →「終了」してください(ペットはクリック透過なので直接は触れません)。

## コマンド一覧

- `minion` / `minion reboot` — 停止して起動し直す(macOS)
- `minion start` — 起動する。すでに起動中なら何もしない(macOS)
- `minion kill` — ペットと gateway を停止する
- `minion serve` — gateway をこのターミナルで前面起動する(Windows 用)
- `minion status` — 起動状況を表示する
- `minion discord status` — Discord 連携の設定状況を表示する
- `minion dex` — 実績とミニオン図鑑を表示する
- `minion config list / get / set` — 設定の一覧・取得・書き込み
- `minion dev` — デバッグビルドで起動し直す(macOS)

どのコマンドも `-h` を付けると詳しい説明が出ます。設定は
`~/.config/minion/config.json`、実行時状態は `~/.minion` に保存されます。

ペットの供給元は設定でオン・オフできます。`minion config set claude.enabled false`
で Claude Code セッションのペットを止め(デフォルトは有効)、
`minion config set discord.enabled false` で Discord 連携を設定を残したまま止めます。

グローバルインストールしていない場合は、`minion` の部分を
`npx @shigureni/minion` に読み替えてください(例: `npx @shigureni/minion status`)。

## Discord のフレンドをペットにする

自分とフレンドが参加する小さな Discord サーバーに Bot を置く方式です
(Discord の規約上、これがフレンドの状態を取得できる唯一の方法です。
セルフボットやフレンドリスト API は使いません)。

1. [Discord Developer Portal](https://discord.com/developers/applications) で
   `New Application` → 左メニューの `Bot` へ
2. Bot ページで `PRESENCE INTENT` と `SERVER MEMBERS INTENT` を ON にする
3. `OAuth2 → URL Generator` で scope に `bot` だけを選び(権限は不要)、
   生成された URL から自分とフレンドのいる私設サーバーへ Bot を招待する
4. 設定を書き込む:

   ```sh
   minion config set discord.token <Botトークン>
   minion config set discord.guildId <サーバーID>
   # サーバーIDは Discord の設定 → 詳細設定 → 開発者モードを ON にして
   # サーバー名を右クリック → 「サーバーIDをコピー」
   ```

   特定のフレンドだけ表示したい場合(任意):

   ```sh
   minion config set discord.userIds <userId,userId,...>
   ```

5. gateway を起動し直す(macOS: `minion reboot` / Windows: `minion serve` を
   Ctrl+C して再実行)
6. `minion discord status` で状態を確認

⚠️ Bot トークンは `~/.config/minion/config.json` に平文で保存されます。人に見せたり
リポジトリにコミットしたりしないでください。

詳しい仕組みは [.docs/discord.md](.docs/discord.md) を参照。

## 図鑑

`minion dex` は Claude Code の使い方をコレクションゲームにします。使い込むほど
実績が解除され、深夜のセッションや連続稼働日数などの条件でレアなミニオンが
出現します。未発見の項目は `???` のまま隠されています。

## 開発

[Bun](https://bun.sh) なら `@/*` エイリアスをネイティブに解決しつつ TS ソースを
直接実行できます(`bun cli/src/index.ts status`)。配布物はNode専用の
`npm run build` が `dist/` に出力します。

```sh
npm install
npm run check   # フォーマット + lint + 型チェック
npm run test
```

設計メモとコントリビュート規約は [CLAUDE.md](CLAUDE.md)(英語)にあります。
English README: [README.md](README.md)
