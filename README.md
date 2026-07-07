# minion

日本語ガイドは [README.ja.md](README.ja.md) へ。

A tiny desktop pet that walks around your macOS screen and reacts to your
[Claude Code](https://claude.com/claude-code) sessions — napping while you're
idle, running around while Claude is busy working.

The more you use Claude Code, the more you collect: heavy usage, late-night
sessions, and day streaks unlock achievements and rare minions in a built-in dex.

## Requirements

- macOS
- [Bun](https://bun.sh)
- Xcode Command Line Tools (`xcode-select --install`) — needed once, to compile
  the pet on first run

## Quick start

```sh
bunx @shigureni/minion
```

The first run compiles the pet (takes a minute), then it appears on your screen
and starts watching your Claude Code sessions. Later runs reuse the build.

To keep the `minion` command around:

```sh
bun add -g @shigureni/minion
minion
```

## Commands

| Command                          | What it does                             |
| -------------------------------- | ---------------------------------------- |
| `minion` / `minion start`        | Start the pet. No-op if already running. |
| `minion kill`                    | Stop the pet and its gateway.            |
| `minion reboot`                  | Restart.                                 |
| `minion status`                  | Is it running?                           |
| `minion dex`                     | Your achievements and minion collection. |
| `minion config list / get / set` | Tweak settings.                          |
| `minion dev`                     | Restart with a debug build.              |

Add `-h` to any command for details. Config lives in `~/.config/minion/config.json`,
runtime state in `~/.minion`.

Pet sources can be toggled per config: `minion config set claude.enabled false`
stops mirroring Claude Code sessions (on by default), and
`minion config set discord.enabled false` pauses the Discord source without
losing its settings.

## Discord friends as pets

Point a small Discord bot at a private server you share with friends, and each
member becomes a pet: appearing and running around while they're online,
settling down with a 🎮 while they play a game, and leaving the screen when
they go offline. Fully
ToS-compliant — no self-bots, no friend-list API; it only sees members of that
one server. Setup guide: [.docs/discord.md](.docs/discord.md), then check with
`minion discord status`.

## Windows

The Swift overlay is macOS-only, but the gateway and the Discord source run
anywhere Bun does. On Windows:

```sh
bun cli/src/index.ts serve      # runs the gateway in the foreground
cd electron && npm install && npm start   # the Windows overlay client
```

See [electron/README.md](electron/README.md).

## The dex

`minion dex` turns your Claude Code habits into a collection game. It reads your
session activity and token usage (from Claude Code's local transcripts) and
unlocks two kinds of things:

- **Achievements** — milestones like your first session, a 7-day streak, running
  5 sessions at once, or burning a million tokens in a day.
- **Minions** — the five common species come out at different times of day; the
  rare ones demand something special: 5+ parallel sessions, a week-long streak,
  hopping across 10 different projects, 10M lifetime tokens, coding at 3am...

Undiscovered entries stay hidden as `???` until you earn them. Sprites aren't
wired into the desktop pet yet — for now the dex is a text-only collection — but
per-species art hooks are already in place.

## Use it as a library

Everything the CLI does is also a programmable API:

```ts
import { Minion } from "@shigureni/minion"

const minion = new Minion()
// { kind: "started", pid } | { kind: "build-failed", ... } | ... | Error — the library never throws
const result = await minion.app.start()

const stats = minion.stats.collect()
const { species } = minion.collection.evaluate(stats)
console.log(`right now: ${species.name}`)
```

Everything is injectable. Bring your own species/achievement catalogs — including
your own art via each entry's `asset` field — or run fully sandboxed in tests:

```ts
// Custom catalog: your species, your conditions, your sprites.
const custom = new Minion({
  species: [
    {
      id: "sunny",
      name: "Sunny Pal",
      rarity: "common",
      description: "Appears during the day.",
      condition: (s) => s.timeBucket === "day",
      asset: "sprites/sunny.png",
    },
  ],
})

// Sandbox: no real disk, processes, or clock.
const sandbox = Minion.inMemory()
```

### Compose your own pieces

The renderers (swift/, electron/), the pet sources (Claude Code, Discord), and
the library itself are deliberately decoupled. Subpath entries let you import
one area without bundling the rest:

```ts
import { PetSource, MinionGatewayServer } from "@shigureni/minion/gateway"
import type { SessionInfo } from "@shigureni/minion/gateway"

// Any feed can be a pet: implement read() and hand it to the facade.
class BuildBotSource extends PetSource {
  read(): Map<string, SessionInfo> {
    return new Map([["ci:main", { running: true, name: "CI" }]])
  }
}

const minion = new Minion({ petSources: [new BuildBotSource()] })
```

Entry points: `/gateway` (PetSource, behavior engine, WS server + snapshot
protocol), `/discord`, `/app`, `/stats`, `/collection`, `/config`,
`/boundaries` (fs/process/clock/random/ws + Node/Memory impls), and `/cli`.

The CLI is assemblable too — the published bin is one function call:

```ts
import { createMinionApp, DEFAULT_COMMANDS, runMinionCli } from "@shigureni/minion/cli"

await runMinionCli({
  minion,
  app: createMinionApp({
    commands: [...DEFAULT_COMMANDS, { path: "/party", handlers: party }],
  }),
})
```

See `lib/index.ts` for the full API surface.

## Development

```sh
bun install
bun run check   # format + lint + type-check
bun run test
```

Architecture notes and contributor conventions live in [CLAUDE.md](CLAUDE.md).
