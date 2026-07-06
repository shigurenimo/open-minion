# minion

A tiny desktop pet that walks around your screen and reacts to your
[Claude Code](https://claude.com/claude-code) sessions — idle while you're idle,
running around while a session is busy.

It's three parts: a Swift menu-less overlay app (`swift/`) that draws the pet, a
programmable library (`lib/`) that builds/runs it and watches `~/.claude/sessions`
to decide how the pet should behave, and a CLI (`cli/`) that's a thin consumer of
that library.

## Requirements

- macOS
- [Bun](https://bun.sh)
- Xcode Command Line Tools (`xcode-select --install`) — needed once, to compile the
  Swift app on first run

## Usage

```sh
bunx @shigureni/minion
```

This builds the app on first run (subsequent runs reuse the build unless the Swift
source changed) and starts it in the background, alongside a small local gateway
that watches your Claude Code sessions.

Or install it globally so the `minion` command is always available:

```sh
bun add -g @shigureni/minion
minion
```

### Commands

| Command                           | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `minion` / `minion start`         | Start (release build). No-op if already running. |
| `minion dev`                      | Restart with a debug build.                      |
| `minion kill`                     | Stop the app and its gateway.                    |
| `minion reboot`                   | Restart with a release build.                    |
| `minion status`                   | Show whether the app/gateway are running.        |
| `minion config list`              | List config values.                              |
| `minion config get <key>`         | Get a config value.                              |
| `minion config set <key> <value>` | Set a config value.                              |

Add `-h` to any command for its help text (e.g. `minion start -h`).

State (pid files, config, and the Swift build output) lives in `~/.minion`,
independent of wherever the package itself is installed.

## Library

Everything the CLI does is exposed programmatically through the `Minion` facade —
the CLI (`cli/`) is just a Hono-routed consumer of it, wired via `c.env.minion`.

```ts
import { Minion } from "@shigureni/minion"

const minion = new Minion()

console.log(await minion.app.start(false)) // build (if needed) + launch the app + gateway
console.log(minion.app.status())
minion.config.set("greeting", "hello")
```

Every side-effecting boundary (filesystem, process spawning, clock, randomness) is
injected, so tests can swap in an in-memory sandbox that touches no real disk,
processes, or wall-clock time:

```ts
import { Minion } from "@shigureni/minion"

const minion = Minion.inMemory()
await minion.app.start(false)
```

See `lib/index.ts` for the full exported surface (the `Minion` facade, the
`MinionAppRunner` / `MinionConfigStore` / `MinionGatewayServer` engine classes, and
the `Node*`/`Memory*` implementation of each IO boundary).

## Development

```sh
bun install
bun run check   # format + lint + type-check (vite-plus)
bun run test
bun run fmt
bun run lint
```

Business logic lives in `lib/` (build/start/kill/status, config, session watching,
pet behavior) behind injected `MinionFileSystem` / `MinionProcessRunner` /
`MinionClock` / `MinionRandomSource` boundaries — real (`Node*`) implementations for
production, in-memory (`Memory*`) ones for tests. `cli/src/routes/<command>/route.ts`
is one file per command (hono-routed, mirrors the structure of jobantenna-cli); each
handler just calls into `c.env.minion` — adding a command means adding a route file,
wiring it into `cli/src/app.ts`, and (if it's new behavior) adding it to `Minion`.
