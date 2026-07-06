# minion

A tiny desktop pet that walks around your screen and reacts to your
[Claude Code](https://claude.com/claude-code) sessions — idle while you're idle,
running around while a session is busy.

It's two parts: a Swift menu-less overlay app (`swift/`) that draws the pet, and a
CLI (`cli/`) that builds/runs it and watches `~/.claude/sessions` to decide how the
pet should behave.

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

## Development

```sh
bun install
bun run check   # format + lint + type-check (vite-plus)
bun run test
bun run fmt
bun run lint
```

`cli/src/routes/<command>/route.ts` is one file per command (hono-routed, mirrors
the structure of jobantenna-cli) — adding a command means adding a route file and
wiring it into `cli/src/app.ts`.
