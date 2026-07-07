import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryMinionFileSystem } from "./engine/fs/memory-file-system.js";
import { NodeMinionFileSystem } from "./engine/fs/node-file-system.js";
import { MemoryMinionProcessRunner } from "./engine/process/memory-process-runner.js";
import { NodeMinionProcessRunner } from "./engine/process/node-process-runner.js";
import { MemoryMinionClock } from "./engine/time/memory-clock.js";
import { NodeMinionClock } from "./engine/time/node-clock.js";
import { MemoryMinionRandomSource } from "./engine/random/memory-random-source.js";
import { NodeMinionRandomSource } from "./engine/random/node-random-source.js";
import { resolveMinionPaths } from "./engine/app/app-paths.js";
import { MinionAppRunner } from "./engine/app/app-runner.js";
import { migrateLegacyConfigFile, MinionConfigStore } from "./engine/config/config-store.js";
import { MinionCollectionStore } from "./engine/collection/collection-store.js";
import { MinionCollectionTracker } from "./engine/collection/collection-tracker.js";
import { DiscordGatewayClient } from "./engine/discord/discord-gateway-client.js";
import { DiscordPetSource } from "./engine/discord/discord-pet-source.js";
import { MemoryMinionWebSocketFactory } from "./engine/discord/memory-websocket-factory.js";
import { NodeMinionWebSocketFactory } from "./engine/discord/node-websocket-factory.js";
import { ClaudeSessionsPetSource } from "./engine/gateway/pet-source.js";
import { readGatewaySnapshot, } from "./engine/gateway/gateway-probe.js";
import { MinionGatewayServer } from "./engine/gateway/gateway-server.js";
import { resolveGatewayDaemonScript } from "./engine/gateway/resolve-daemon-script.js";
import { SessionStatsTracker } from "./engine/stats/session-stats-tracker.js";
import { TokenUsageTracker } from "./engine/stats/token-usage-tracker.js";
import { MinionStatsCollector } from "./engine/stats/stats-collector.js";
const SANDBOX_PACKAGE_ROOT = "/sandbox/pkg";
const SANDBOX_DATA_DIR = "/sandbox/.minion";
const SANDBOX_CONFIG_DIR = "/sandbox/.config/minion";
const SANDBOX_SESSIONS_DIR = "/sandbox/.claude/sessions";
const SANDBOX_PROJECTS_DIR = "/sandbox/.claude/projects";
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
    paths;
    config;
    app;
    stats;
    collection;
    fs;
    process;
    clock;
    random;
    webSockets;
    fetchFn;
    sessionsDir;
    projectsDir;
    extraPetSources;
    constructor(props = {}) {
        const packageRoot = props.packageRoot ?? defaultPackageRoot();
        const fs = props.fs ?? new NodeMinionFileSystem();
        const processRunner = props.process ?? new NodeMinionProcessRunner();
        const clock = props.clock ?? new NodeMinionClock();
        const random = props.random ?? new NodeMinionRandomSource();
        const projectsDir = props.projectsDir ?? join(homedir(), ".claude", "projects");
        this.fs = fs;
        this.process = processRunner;
        this.clock = clock;
        this.random = random;
        this.webSockets = props.webSockets ?? new NodeMinionWebSocketFactory();
        this.fetchFn = props.fetchFn ?? ((url, init) => fetch(url, init));
        this.sessionsDir = props.sessionsDir ?? join(homedir(), ".claude", "sessions");
        this.projectsDir = projectsDir;
        this.extraPetSources = props.petSources ?? [];
        this.paths = resolveMinionPaths({
            packageRoot,
            dataDir: props.dataDir,
            configDir: props.configDir,
        });
        // 失敗しても致命ではない (config が空として読まれるだけ) ので、結果は握りつぶす。
        migrateLegacyConfigFile({ fs, from: this.paths.legacyConfigFile, to: this.paths.configFile });
        this.config = new MinionConfigStore({ fs, path: this.paths.configFile });
        this.app = new MinionAppRunner({
            fs,
            process: processRunner,
            paths: this.paths,
            // 実行中のランタイム (node / bun) をそのまま使う — 追加ランタイムを要求しない。
            gatewayCommand: [process.execPath, resolveGatewayDaemonScript()],
            onEvent: props.onEvent,
        });
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
        });
        this.collection = new MinionCollectionTracker({
            store: new MinionCollectionStore({ fs, path: this.paths.collectionFile }),
            species: props.species,
            achievements: props.achievements,
        });
        Object.freeze(this);
    }
    /**
     * Sandboxed Minion wired with in-memory implementations for every IO
     * boundary. Touches no real disk, processes, or wall-clock time — safe
     * for tests and ad-hoc experiments. Override individual fields via `props`.
     *
     * NOT covered by `inMemory()`: `gatewayServer().start()` still calls
     * a real `node:http` server and binds a real port; pass `port: 0` to let the OS pick one.
     */
    static inMemory(props = {}) {
        // The default sandbox fs stamps mtimes off the sandbox clock, so
        // recency-based logic (e.g. the token-scan backfill window) sees one
        // consistent timeline instead of mixing wall-clock mtimes with a frozen clock.
        const clock = props.clock ?? new MemoryMinionClock();
        return new Minion({
            ...props,
            fs: props.fs ?? new MemoryMinionFileSystem({ now: () => clock.millis() }),
            process: props.process ?? new MemoryMinionProcessRunner(),
            clock,
            random: props.random ?? new MemoryMinionRandomSource(),
            webSockets: props.webSockets ?? new MemoryMinionWebSocketFactory(),
            fetchFn: props.fetchFn ??
                (() => Promise.reject(new Error("サンドボックスの Minion はネットワークに接続できません"))),
            packageRoot: props.packageRoot ?? SANDBOX_PACKAGE_ROOT,
            dataDir: props.dataDir ?? SANDBOX_DATA_DIR,
            configDir: props.configDir ?? SANDBOX_CONFIG_DIR,
            sessionsDir: props.sessionsDir ?? SANDBOX_SESSIONS_DIR,
            projectsDir: props.projectsDir ?? SANDBOX_PROJECTS_DIR,
        });
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
    gatewayServer(options = {}) {
        return new MinionGatewayServer({
            clock: this.clock,
            random: this.random,
            sources: [...this.claudePetSources(), ...this.discordPetSources(), ...this.extraPetSources],
            port: options.port,
            tickMs: options.tickMs,
        });
    }
    /**
     * Snapshot from the *running* gateway process (the daemon started by
     * `app.start()`, or a foreground `minion serve`) over HTTP. Returns an
     * Error when no gateway is listening. `gatewayServer()` by contrast
     * constructs a new in-process server.
     */
    async gatewaySnapshot(options = {}) {
        return readGatewaySnapshot({ port: options.port, fetchFn: this.fetchFn });
    }
    claudePetSources() {
        if (this.config.get("claude.enabled") === "false")
            return [];
        return [
            new ClaudeSessionsPetSource({
                fs: this.fs,
                process: this.process,
                clock: this.clock,
                sessionsDir: this.sessionsDir,
                projectsDir: this.projectsDir,
            }),
        ];
    }
    discordPetSources() {
        if (this.config.get("discord.enabled") === "false")
            return [];
        const token = this.config.get("discord.token");
        const guildId = this.config.get("discord.guildId");
        if (token === undefined || token === "" || guildId === undefined || guildId === "")
            return [];
        const userIds = (this.config.get("discord.userIds") ?? "")
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id !== "");
        const client = new DiscordGatewayClient({
            token,
            guildId,
            webSockets: this.webSockets,
            random: this.random,
            userIds: userIds.length > 0 ? userIds : undefined,
        });
        return [new DiscordPetSource({ client })];
    }
}
function defaultPackageRoot() {
    // TS ソースなら lib/.. がルートだが、dist 実行時は dist/lib/.. = dist になってしまう。
    // package.json が現れるまで遡る (swift/ はパッケージルート直下にある)。
    // URL.pathname はパスに空白や非ASCII文字があるとパーセントエンコードされたまま壊れる
    let dir = fileURLToPath(new URL(".", import.meta.url));
    for (let depth = 0; depth < 10; depth++) {
        if (existsSync(join(dir, "package.json")))
            return dir;
        const parent = dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return fileURLToPath(new URL("..", import.meta.url));
}
