# CLAUDE.md

Desktop pet that reacts to Claude Code sessions and Discord friend presence. Four parts:

- `swift/` — the macOS overlay app (Swift Package) that draws the pet
- `electron/` — the Windows overlay client (independent package with its own package.json)
- `lib/` — the programmable API (`@shigureni/minion`); all business logic lives here
- `cli/` — thin hono-routed CLI that consumes the `Minion` facade

Runtime is Node (engines >=22). Dev runs the TS sources directly via Node's
type stripping (23.6+): `node cli/src/index.ts <command>`. `npm run build`
(tsc + `rewriteRelativeImportExtensions`) emits `dist/`, which is what the
published bin / exports / npx run — hence every relative import carries an
explicit `.ts` extension; keep that convention or both Node-direct execution
and the build break.

## Commands

```sh
npm run check   # fmt + lint + type-check (vite-plus) — run before finishing
                # (electron/ and dist/ are excluded; electron has its own tsconfig + node_modules)
npm run test    # vitest
npm run build   # tsc -> dist/ (what npx/the published bin actually runs)
npm run fmt     # auto-fix formatting — run after editing
```

Imports are plain relative paths with explicit `.ts` extensions (no aliases) —
required for Node-direct execution and rewritten to `.js` at build time.

## lib/ — the library

Public surface is `lib/index.ts` (batteries-included) plus one subpath entry per
area — `lib/gateway.ts` / `discord` / `app` / `stats` / `collection` / `config` /
`boundaries`, each a separate module graph mapped in package.json `exports` so
consumers can import one area without bundling the rest. A new module must be
re-exported from its area entry (index.ts re-exports the entries). The `Minion`
facade (`lib/minion.ts`) wires every facet at construction time and freezes
itself; `Minion.inMemory()` returns a fully sandboxed instance (memory
FS/process/clock/random/ws/fetch, `/sandbox/*` paths).

Every IO boundary follows one pattern (mirroring ~/open-claude-funnel): an abstract
class plus a `Node*` (real) and a `Memory*` (test double) implementation:

- `MinionFileSystem` (fs), `MinionProcessRunner` (process), `MinionClock` (time),
  `MinionRandomSource` (random), `MinionWebSocketFactory` (ws client, `engine/discord/`);
  plus `MinionFetch` (a plain function prop, no class trio) for the one HTTP probe
  (`Minion.gatewaySnapshot()` → `gateway-probe.ts`)

Domain code never calls `node:fs` / `node:child_process` / `Date.now()` / `Math.random()`
directly — boundaries arrive via constructor props. Persisted JSON state goes
through `JsonFileStore<T>`, which validates reads against a required zod schema.
Config lives at `$XDG_CONFIG_HOME/minion/config.json` (default `~/.config/minion`,
one-time migration copies the pre-0.5 `~/.minion/config.json`); runtime state
(pids, build output, stats) stays under `~/.minion` (see `app-paths.ts`).

**Errors are values, not exceptions.** Nothing in `lib/` throws: fallible
operations return `T | Error`, checked with `instanceof Error`. The boundary
implementations (`Node*`, the http server in `gateway-server.ts`) catch their
runtime's exceptions via `toError()` / `safeJsonParse()` (`engine/errors.ts`)
and convert them at the edge. Don't add `throw` / bare `JSON.parse`; plumb the
Error back to the caller instead. The CLI maps an Error result to a 500
(→ stderr + exit 1).

Engine subdirectories:

- `engine/app` — Swift build/start/kill/status (`MinionAppRunner`), path resolution
  (`resolveMinionPaths`), source-hash-based build skipping
- `engine/gateway` — session watching (`readActiveSessions`), the `PetSource`
  abstraction merging pet feeds (`pet-source.ts`), the pure pet state
  machine (`PetBehaviorEngine`), Hono routes, the HTTP/WS server
  (`MinionGatewayServer` — source-injected: it builds nothing itself, the
  facade assembles `sources` from config + `MinionOptions.petSources`),
  the HTTP probe of a running gateway (`gateway-probe.ts`), and the
  detached daemon entry (`gateway-daemon.ts`)
- `engine/discord` — friend presence as a `PetSource`: raw Discord Gateway WS
  client (`DiscordGatewayClient`, no discord.js), pure event-application cache
  (`DiscordPresenceCache`), and the `MinionWebSocketFactory` boundary. Enabled
  automatically when `discord.token` + `discord.guildId` exist in config;
  `discord.enabled=false` pauses it, `claude.enabled=false` likewise disables
  the Claude sessions source. Setup + protocol notes in `.docs/discord.md`.
- `engine/stats` — `SessionStatsTracker` (lifetime/concurrency/streak/projects),
  `TokenUsageTracker` (incremental transcript scan), `MinionStatsCollector`
  combining both into a `StatsSnapshot`
- `engine/collection` — species/achievement catalogs, `MinionCollectionTracker`
  (evaluate + dex view), persisted unlock store

## cli/

One file per command: `cli/src/routes/<command>/route.ts` (hono-routed, mirrors
jobantenna-cli). Handlers only call `c.env.minion`. The app is assembled from a
command table (`DEFAULT_COMMANDS` + `createMinionApp()` in `cli/src/app.ts`) and
run by `runMinionCli()` (`cli/src/run.ts`); the bin (`cli/src/index.ts`) is just
`runMinionCli()` with defaults, and `@shigureni/minion/cli` (`cli/src/cli.ts`)
exposes the whole assembly surface to consumers. Adding a command means: route
file → entry in `DEFAULT_COMMANDS` → `DEFAULT_HELP` in `cli/src/run.ts` →
`DEFAULT_USAGE` in `routes/not-found.ts` → re-export check in `cli/src/cli.ts`.
CLI output text is Japanese; keep it that way.

## Constraints & gotchas

- **Keep HTTP logic in plain Hono apps.** Routes (`gateway-routes.ts`) are
  exercised via `.request()`; `MinionGatewayServer.start()` is the only place
  that binds a real server (@hono/node-server + `ws` upgrade at `/ws`). It is
  async because `node:http` reports bind failures asynchronously, and it IS
  testable — pass `port: 0` (see gateway-server.test.ts). The server binds
  127.0.0.1 only.
- **Persisted-schema evolution = per-field `.catch()` in the store's zod schema.**
  `JsonFileStore`'s `defaultValue` covers a missing/corrupt/wrong-shape file
  wholesale; a valid-but-outdated file (new field added later) is handled by
  giving that field a `.catch(default)` in the schema (see
  `session-stats-tracker.ts`). A new field without `.catch()` makes every
  pre-existing `~/.minion/*.json` read fall back to `defaultValue`, silently
  resetting stats.
- **UTC day bucketing must stay consistent.** `TokenUsageTracker` buckets tokens by
  each transcript line's UTC timestamp; `MinionStatsCollector` computes
  "today"/"this week" from the same UTC date. Change one, change both.
- **Species catalog order = priority.** `resolveSpecies` returns the first matching
  entry. Rare/specific conditions go first; the five time-of-day commons together
  cover every hour and must stay last as the guaranteed fallback. A custom catalog
  needs its own fully-covering fallback or `resolveSpecies` throws.
- **Catalogs are DI'd.** `DEFAULT_MINION_SPECIES` / `DEFAULT_ACHIEVEMENTS` are
  defaults only; `new Minion({ species, achievements })` replaces them wholesale.
  `asset` on each entry is an opaque string for a host renderer — the library never
  reads it, and the Swift app doesn't consume it yet. Both catalogs are documented
  in `.docs/` (species.md / achievements.md) — update those tables when a catalog
  changes.
- **`ACTIONS` in `pet-behavior.ts` mirrors every renderer — 3-way sync.** The clip
  order must match `PetView.clips` in `swift/Sources/open-minion/` AND `CLIPS` in
  `electron/src/renderer/clips.ts`; only "which clip, how long" is decided TS-side.
- **Snapshot `state` stays binary.** `PetSnapshotEntry.state` is
  `"running" | "sleeping"` — new nuances (e.g. a Discord friend gaming) ride on
  optional fields like `activity?: "gaming"` so renderers that ignore unknown
  fields (the Swift app) keep working. Don't add a third `state` value.
- **Token scanning is incremental, and never reads old history.** Per-file
  mtime + consumed-line-count in `~/.minion/usage-scan.json`; an unseen file
  whose mtime is outside the 7-day backfill window is skipped entirely
  (`BACKFILL_WINDOW_MS` — must stay >= the `WEEK_DAYS` window in
  stats-collector.ts), so even the first-ever scan only parses the active
  week and `tokensTotal` is "since minion was installed", not all time.
  Incremental scans are ~0.1s. Don't break the trailing-newline handling
  (blank lines are filtered before indexing). Per-line transcript parsing is
  the one hot path exempt from the zod rule — it uses hand-rolled `typeof`
  guards (`addLineUsage`) because zod roughly doubles the per-line cost
  across hundreds of thousands of lines. Small files (persisted `~/.minion`
  state, session files) stay zod-validated.
- **Timezone-safe tests.** When a test cares about local `hour`, construct dates
  with local-time fields (`new Date(2026, 6, 6, 21, 30)`), never a UTC ISO string.
- **Session liveness.** `updatedAt` in `~/.claude/sessions/*.json` only changes on
  status flips, so a long-busy session can't be judged by elapsed time — trust
  `status` while the pid is alive, apply the 8-minute stale window only after death.
  claude-desktop sessions never write `status` at all (their file is written once
  at startup); for those, busy = the session's transcript
  (`~/.claude/projects/<cwd flattened>/<sessionId>.jsonl`) was modified within
  the last 2 minutes (`isTranscriptActive` in `sessions.ts`).
