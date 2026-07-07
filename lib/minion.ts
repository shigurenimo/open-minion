import { homedir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { MinionFileSystem } from "./engine/fs/file-system"
import { MemoryMinionFileSystem } from "./engine/fs/memory-file-system"
import { NodeMinionFileSystem } from "./engine/fs/node-file-system"
import type { MinionProcessRunner } from "./engine/process/process-runner"
import { MemoryMinionProcessRunner } from "./engine/process/memory-process-runner"
import { NodeMinionProcessRunner } from "./engine/process/node-process-runner"
import type { MinionClock } from "./engine/time/clock"
import { MemoryMinionClock } from "./engine/time/memory-clock"
import { NodeMinionClock } from "./engine/time/node-clock"
import type { MinionRandomSource } from "./engine/random/random-source"
import { MemoryMinionRandomSource } from "./engine/random/memory-random-source"
import { NodeMinionRandomSource } from "./engine/random/node-random-source"
import { type MinionPaths, resolveMinionPaths } from "./engine/app/app-paths"
import { type MinionAppEvent, MinionAppRunner } from "./engine/app/app-runner"
import { migrateLegacyConfigFile, MinionConfigStore } from "./engine/config/config-store"
import type { Achievement } from "./engine/collection/achievements"
import { MinionCollectionStore } from "./engine/collection/collection-store"
import { MinionCollectionTracker } from "./engine/collection/collection-tracker"
import type { MinionSpecies } from "./engine/collection/species"
import { DiscordGatewayClient } from "./engine/discord/discord-gateway-client"
import { DiscordPetSource } from "./engine/discord/discord-pet-source"
import { MemoryMinionWebSocketFactory } from "./engine/discord/memory-websocket-factory"
import { NodeMinionWebSocketFactory } from "./engine/discord/node-websocket-factory"
import type { MinionWebSocketFactory } from "./engine/discord/websocket-factory"
import { ClaudeSessionsPetSource, type PetSource } from "./engine/gateway/pet-source"
import { MinionGatewayServer } from "./engine/gateway/gateway-server"
import { resolveGatewayDaemonScript } from "./engine/gateway/resolve-daemon-script"
import { SessionStatsTracker } from "./engine/stats/session-stats-tracker"
import { TokenUsageTracker } from "./engine/stats/token-usage-tracker"
import { MinionStatsCollector } from "./engine/stats/stats-collector"

const SANDBOX_PACKAGE_ROOT = "/sandbox/pkg"
const SANDBOX_DATA_DIR = "/sandbox/.minion"
const SANDBOX_CONFIG_DIR = "/sandbox/.config/minion"
const SANDBOX_SESSIONS_DIR = "/sandbox/.claude/sessions"
const SANDBOX_PROJECTS_DIR = "/sandbox/.claude/projects"

export type MinionOptions = {
  /** Filesystem boundary. Replace with MemoryMinionFileSystem to sandbox all disk I/O. */
  fs?: MinionFileSystem
  /** Process runner used to build/spawn the Swift app and the gateway daemon. */
  process?: MinionProcessRunner
  /** Clock used for session-staleness checks and pet-behavior timing. */
  clock?: MinionClock
  /** Randomness used by the pet behavior picker. */
  random?: MinionRandomSource
  /** WebSocket-client boundary used by the Discord presence source. Replace with MemoryMinionWebSocketFactory to sandbox network I/O. */
  webSockets?: MinionWebSocketFactory
  /** Directory containing `swift/` (the package root). Defaults to the installed package root. */
  packageRoot?: string
  /** Runtime-state directory (pid files, build output, stats). Defaults to `~/.minion`. */
  dataDir?: string
  /** Config directory (`config.json`). Defaults to `$XDG_CONFIG_HOME/minion`, i.e. `~/.config/minion`. */
  configDir?: string
  /** Directory of Claude Code session files the gateway watches. Defaults to `~/.claude/sessions`. */
  sessionsDir?: string
  /** Claude Code's transcript root, scanned for token usage. Defaults to `~/.claude/projects`. */
  projectsDir?: string
  /** Minion species catalog for `minion.collection`. Defaults to `DEFAULT_MINION_SPECIES` — pass your own to add species, retheme the built-ins, or attach real image `asset` references. */
  species?: MinionSpecies[]
  /** Achievement catalog for `minion.collection`. Defaults to `DEFAULT_ACHIEVEMENTS` — pass your own to replace it entirely. */
  achievements?: Achievement[]
  /**
   * Extra pet feeds merged after the built-in ones (Claude Code sessions,
   * Discord presence) on every gateway tick. Combine with
   * `claude.enabled=false` / `discord.enabled=false` in config to replace
   * the built-ins entirely.
   */
  petSources?: PetSource[]
  /** Progress events from `minion.app` (build started, ...). Defaults to a no-op — the library never writes to stdout itself. */
  onEvent?: (event: MinionAppEvent) => void
}

export type MinionGatewayServerOptions = {
  port?: number
  tickMs?: number
}

/**
 * Facade that wires every minion facet together and exposes the public surface.
 *
 * All side-effecting boundaries (filesystem, process, clock, random) are
 * injected via Props — passing memory implementations gives a fully
 * sandboxed Minion that touches no real disk, processes, or wall-clock time.
 *
 * @example
 * ```ts
 * import { Minion } from "@shigureni/minion"
 *
 * const minion = new Minion()
 * const result = await minion.app.start() // { kind: "started", pid: 123 } | ... | Error
 * if (result instanceof Error) console.error(result.message)
 * console.log(minion.app.status().app.running)
 * ```
 */
export class Minion {
  readonly paths: MinionPaths
  readonly config: MinionConfigStore
  readonly app: MinionAppRunner
  readonly stats: MinionStatsCollector
  readonly collection: MinionCollectionTracker

  private readonly fs: MinionFileSystem
  private readonly process: MinionProcessRunner
  private readonly clock: MinionClock
  private readonly random: MinionRandomSource
  private readonly webSockets: MinionWebSocketFactory
  private readonly sessionsDir: string
  private readonly projectsDir: string
  private readonly extraPetSources: readonly PetSource[]

  constructor(props: MinionOptions = {}) {
    const packageRoot = props.packageRoot ?? defaultPackageRoot()
    const fs = props.fs ?? new NodeMinionFileSystem()
    const processRunner = props.process ?? new NodeMinionProcessRunner()
    const clock = props.clock ?? new NodeMinionClock()
    const random = props.random ?? new NodeMinionRandomSource()
    const projectsDir = props.projectsDir ?? join(homedir(), ".claude", "projects")

    this.fs = fs
    this.process = processRunner
    this.clock = clock
    this.random = random
    this.webSockets = props.webSockets ?? new NodeMinionWebSocketFactory()
    this.sessionsDir = props.sessionsDir ?? join(homedir(), ".claude", "sessions")
    this.projectsDir = projectsDir
    this.extraPetSources = props.petSources ?? []

    this.paths = resolveMinionPaths({
      packageRoot,
      dataDir: props.dataDir,
      configDir: props.configDir,
    })

    // 失敗しても致命ではない (config が空として読まれるだけ) ので、結果は握りつぶす。
    migrateLegacyConfigFile({ fs, from: this.paths.legacyConfigFile, to: this.paths.configFile })
    this.config = new MinionConfigStore({ fs, path: this.paths.configFile })

    this.app = new MinionAppRunner({
      fs,
      process: processRunner,
      paths: this.paths,
      gatewayCommand: ["bun", resolveGatewayDaemonScript()],
      onEvent: props.onEvent,
    })

    this.stats = new MinionStatsCollector({
      fs,
      process: processRunner,
      clock,
      sessionsDir: this.sessionsDir,
      projectsDir,
      sessionStats: new SessionStatsTracker({ fs, path: this.paths.sessionStatsFile }),
      tokenUsage: new TokenUsageTracker({
        fs,
        clock,
        path: this.paths.usageScanFile,
        projectsDir,
      }),
    })

    this.collection = new MinionCollectionTracker({
      store: new MinionCollectionStore({ fs, path: this.paths.collectionFile }),
      species: props.species,
      achievements: props.achievements,
    })

    Object.freeze(this)
  }

  /**
   * Sandboxed Minion wired with in-memory implementations for every IO
   * boundary. Touches no real disk, processes, or wall-clock time — safe
   * for tests and ad-hoc experiments. Override individual fields via `props`.
   *
   * NOT covered by `inMemory()`: `gatewayServer().start()` still calls
   * `Bun.serve` and binds a real port; pass `port: 0` to let the OS pick one.
   */
  static inMemory(props: MinionOptions = {}): Minion {
    // The default sandbox fs stamps mtimes off the sandbox clock, so
    // recency-based logic (e.g. the token-scan backfill window) sees one
    // consistent timeline instead of mixing wall-clock mtimes with a frozen clock.
    const clock = props.clock ?? new MemoryMinionClock()
    return new Minion({
      ...props,
      fs: props.fs ?? new MemoryMinionFileSystem({ now: () => clock.millis() }),
      process: props.process ?? new MemoryMinionProcessRunner(),
      clock,
      random: props.random ?? new MemoryMinionRandomSource(),
      webSockets: props.webSockets ?? new MemoryMinionWebSocketFactory(),
      packageRoot: props.packageRoot ?? SANDBOX_PACKAGE_ROOT,
      dataDir: props.dataDir ?? SANDBOX_DATA_DIR,
      configDir: props.configDir ?? SANDBOX_CONFIG_DIR,
      sessionsDir: props.sessionsDir ?? SANDBOX_SESSIONS_DIR,
      projectsDir: props.projectsDir ?? SANDBOX_PROJECTS_DIR,
    })
  }

  /**
   * In-process gateway server (HTTP + WebSocket) that merges every pet source
   * and drives the pet's animation state. The daemon spawned by `app.start()`
   * runs this same class out-of-process via `gateway-daemon.ts`.
   *
   * Sources are assembled from config at call time:
   * - Claude Code sessions — on by default, off with `claude.enabled=false`
   * - Discord presence — on when `discord.token` + `discord.guildId` are both
   *   set, off with `discord.enabled=false`. Friends in that guild appear as
   *   extra pets (`discord:<userId>`) while they are online.
   * - anything passed via `MinionOptions.petSources`, appended last
   */
  gatewayServer(options: MinionGatewayServerOptions = {}): MinionGatewayServer {
    return new MinionGatewayServer({
      clock: this.clock,
      random: this.random,
      sources: [...this.claudePetSources(), ...this.discordPetSources(), ...this.extraPetSources],
      port: options.port,
      tickMs: options.tickMs,
    })
  }

  private claudePetSources(): PetSource[] {
    if (this.config.get("claude.enabled") === "false") return []
    return [
      new ClaudeSessionsPetSource({
        fs: this.fs,
        process: this.process,
        clock: this.clock,
        sessionsDir: this.sessionsDir,
        projectsDir: this.projectsDir,
      }),
    ]
  }

  private discordPetSources(): PetSource[] {
    if (this.config.get("discord.enabled") === "false") return []
    const token = this.config.get("discord.token")
    const guildId = this.config.get("discord.guildId")
    if (token === undefined || token === "" || guildId === undefined || guildId === "") return []

    const userIds = (this.config.get("discord.userIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")

    const client = new DiscordGatewayClient({
      token,
      guildId,
      webSockets: this.webSockets,
      random: this.random,
      userIds: userIds.length > 0 ? userIds : undefined,
    })
    return [new DiscordPetSource({ client })]
  }
}

function defaultPackageRoot(): string {
  // URL.pathname はパスに空白や非ASCII文字があるとパーセントエンコードされたまま壊れる
  return fileURLToPath(new URL("..", import.meta.url))
}
