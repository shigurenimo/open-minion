import type { MinionFileSystem } from "./engine/fs/file-system.ts";
import type { MinionProcessRunner } from "./engine/process/process-runner.ts";
import type { MinionClock } from "./engine/time/clock.ts";
import type { MinionRandomSource } from "./engine/random/random-source.ts";
import { type MinionPaths } from "./engine/app/app-paths.ts";
import { type MinionAppEvent, MinionAppRunner } from "./engine/app/app-runner.ts";
import { MinionConfigStore } from "./engine/config/config-store.ts";
import type { Achievement } from "./engine/collection/achievements.ts";
import { MinionCollectionTracker } from "./engine/collection/collection-tracker.ts";
import type { MinionSpecies } from "./engine/collection/species.ts";
import type { MinionWebSocketFactory } from "./engine/discord/websocket-factory.ts";
import { type PetSource } from "./engine/gateway/pet-source.ts";
import { type GatewaySnapshot, type MinionFetch } from "./engine/gateway/gateway-probe.ts";
import { MinionGatewayServer } from "./engine/gateway/gateway-server.ts";
import { MinionStatsCollector } from "./engine/stats/stats-collector.ts";
export type MinionOptions = {
    /** Filesystem boundary. Replace with MemoryMinionFileSystem to sandbox all disk I/O. */
    fs?: MinionFileSystem;
    /** Process runner used to build/spawn the Swift app and the gateway daemon. */
    process?: MinionProcessRunner;
    /** Clock used for session-staleness checks and pet-behavior timing. */
    clock?: MinionClock;
    /** Randomness used by the pet behavior picker. */
    random?: MinionRandomSource;
    /** WebSocket-client boundary used by the Discord presence source. Replace with MemoryMinionWebSocketFactory to sandbox network I/O. */
    webSockets?: MinionWebSocketFactory;
    /** HTTP fetch used by `gatewaySnapshot()` to probe the running gateway. Replace to sandbox network I/O. */
    fetchFn?: MinionFetch;
    /** Directory containing `swift/` (the package root). Defaults to the installed package root. */
    packageRoot?: string;
    /** Runtime-state directory (pid files, build output, stats). Defaults to `~/.minion`. */
    dataDir?: string;
    /** Config directory (`config.json`). Defaults to `$XDG_CONFIG_HOME/minion`, i.e. `~/.config/minion`. */
    configDir?: string;
    /** Directory of Claude Code session files the gateway watches. Defaults to `~/.claude/sessions`. */
    sessionsDir?: string;
    /** Claude Code's transcript root, scanned for token usage. Defaults to `~/.claude/projects`. */
    projectsDir?: string;
    /** Minion species catalog for `minion.collection`. Defaults to `DEFAULT_MINION_SPECIES` — pass your own to add species, retheme the built-ins, or attach real image `asset` references. */
    species?: MinionSpecies[];
    /** Achievement catalog for `minion.collection`. Defaults to `DEFAULT_ACHIEVEMENTS` — pass your own to replace it entirely. */
    achievements?: Achievement[];
    /**
     * Extra pet feeds merged after the built-in ones (Claude Code sessions,
     * Discord presence) on every gateway tick. Combine with
     * `claude.enabled=false` / `discord.enabled=false` in config to replace
     * the built-ins entirely.
     */
    petSources?: PetSource[];
    /** Progress events from `minion.app` (build started, ...). Defaults to a no-op — the library never writes to stdout itself. */
    onEvent?: (event: MinionAppEvent) => void;
};
export type MinionGatewayServerOptions = {
    port?: number;
    tickMs?: number;
};
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
export declare class Minion {
    readonly paths: MinionPaths;
    readonly config: MinionConfigStore;
    readonly app: MinionAppRunner;
    readonly stats: MinionStatsCollector;
    readonly collection: MinionCollectionTracker;
    private readonly fs;
    private readonly process;
    private readonly clock;
    private readonly random;
    private readonly webSockets;
    private readonly fetchFn;
    private readonly sessionsDir;
    private readonly projectsDir;
    private readonly extraPetSources;
    constructor(props?: MinionOptions);
    /**
     * Sandboxed Minion wired with in-memory implementations for every IO
     * boundary. Touches no real disk, processes, or wall-clock time — safe
     * for tests and ad-hoc experiments. Override individual fields via `props`.
     *
     * NOT covered by `inMemory()`: `gatewayServer().start()` still calls
     * a real `node:http` server and binds a real port; pass `port: 0` to let the OS pick one.
     */
    static inMemory(props?: MinionOptions): Minion;
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
    gatewayServer(options?: MinionGatewayServerOptions): MinionGatewayServer;
    /**
     * Snapshot from the *running* gateway process (the daemon started by
     * `app.start()`, or a foreground `minion serve`) over HTTP. Returns an
     * Error when no gateway is listening. `gatewayServer()` by contrast
     * constructs a new in-process server.
     */
    gatewaySnapshot(options?: {
        port?: number;
    }): Promise<GatewaySnapshot | Error>;
    private claudePetSources;
    private discordPetSources;
}
