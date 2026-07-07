import { describe, expect, it } from "vitest"
import { app, createMinionApp, DEFAULT_COMMANDS } from "./app.ts"
import { factory } from "./factory.ts"
import { postJson } from "./lib/post-json.ts"
import { MemoryMinionFileSystem } from "../../lib/engine/fs/memory-file-system.ts"
import { MemoryMinionProcessRunner } from "../../lib/engine/process/memory-process-runner.ts"
import { Minion } from "../../lib/minion.ts"

describe("app routes", () => {
  it("returns status text for /status via the injected Minion facade", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/status", postJson({}), { minion })

    expect(await res.text()).toBe("停止中\ngateway停止中")
  })

  it("starts the app via /start without touching real disk or processes", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const minion = Minion.inMemory({ fs })

    const res = await app.request("/start", postJson({}), { minion })

    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^起動した \(pid \d+\)$/)
  })

  it("kills the old process and starts fresh when /reboot finds one running", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const process = new MemoryMinionProcessRunner()
    const minion = Minion.inMemory({ fs, process })
    await app.request("/start", postJson({}), { minion })
    // 1回目のstartが生んだ app + gateway のpidを生存扱いにする
    process.setAlivePids([1001, 1002])

    const res = await app.request("/reboot", postJson({}), { minion })

    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^停止した \(pid 1001\)\n起動した \(pid \d+\)$/)
  })

  it("omits the kill line when /reboot had nothing to stop", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const minion = Minion.inMemory({ fs })

    const res = await app.request("/reboot", postJson({}), { minion })

    expect(res.status).toBe(200)
    expect(await res.text()).toMatch(/^起動した \(pid \d+\)$/)
  })

  it("no-ops on /start when the app is already running", async () => {
    const fs = new MemoryMinionFileSystem({
      files: { "/sandbox/pkg/swift/Package.swift": "// package" },
    })
    const process = new MemoryMinionProcessRunner()
    const minion = Minion.inMemory({ fs, process })
    await app.request("/start", postJson({}), { minion })
    process.setAlivePids([1001, 1002])

    const res = await app.request("/start", postJson({}), { minion })

    expect(await res.text()).toBe("すでに起動中 (pid 1001)")
  })

  it("round-trips a value through /config/set and /config/get", async () => {
    const minion = Minion.inMemory()

    await app.request("/config/set/greeting/hello", postJson({}), { minion })
    const res = await app.request("/config/get/greeting", postJson({}), { minion })

    expect(await res.text()).toBe("hello")
  })

  it("404s on /config/get for an unset key", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/config/get/missing", postJson({}), { minion })

    expect(res.status).toBe(404)
    expect(await res.text()).toBe("未設定: missing")
  })

  it("round-trips a URL-encoded value through /config/set and /config/get", async () => {
    const minion = Minion.inMemory()

    const encoded = encodeURIComponent("https://example.com")
    await app.request(`/config/set/url/${encoded}`, postJson({}), { minion })
    const res = await app.request("/config/get/url", postJson({}), { minion })

    expect(await res.text()).toBe("https://example.com")
  })

  it("rejects unknown flags with a 400 instead of silently ignoring them", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/start", postJson({ wat: "true" }), { minion })

    expect(res.status).toBe(400)
  })

  it("lists every configured key via /config/list", async () => {
    const minion = Minion.inMemory()
    await app.request("/config/set/a/1", postJson({}), { minion })
    await app.request("/config/set/b/2", postJson({}), { minion })

    const res = await app.request("/config/list", postJson({}), { minion })

    expect(await res.text()).toBe("a = 1\nb = 2")
  })

  it("returns command help text without dispatching to the facade", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/start", postJson({ help: "true" }), { minion })

    expect(await res.text()).toContain("Usage: minion start")
  })

  it("404s on an unknown route", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/nope", postJson({}), { minion })

    expect(res.status).toBe(404)
  })

  it("shows the current minion plus dex progress via /dex", async () => {
    const minion = Minion.inMemory()

    const res = await app.request("/dex", postJson({}), { minion })
    const text = await res.text()

    expect(text).toContain("現在のミニオン:")
    expect(text).toMatch(/== 実績 \(\d+\/\d+\) ==/)
    expect(text).toMatch(/== ミニオン図鑑 \(\d+\/\d+\) ==/)
  })

  it("unlocks first-session on /dex once a session has been seen", async () => {
    const fs = new MemoryMinionFileSystem({
      files: {
        "/sandbox/.claude/sessions/1.json": JSON.stringify({
          sessionId: "a",
          pid: 1,
          status: "busy",
          updatedAt: 0,
        }),
      },
    })
    const minion = Minion.inMemory({ fs })

    const res = await app.request("/dex", postJson({}), { minion })
    const text = await res.text()

    expect(text).toContain("[x] はじめの一歩 — はじめてセッションを実行した。")
  })
})

describe("createMinionApp", () => {
  it("mounts a custom command alongside the built-ins", async () => {
    const party = factory.createHandlers((c) => c.text("🎉"))
    const custom = createMinionApp({
      commands: [...DEFAULT_COMMANDS, { path: "/party", handlers: party }],
    })

    const res = await custom.request("/party", postJson({}), { minion: Minion.inMemory() })
    expect(await res.text()).toBe("🎉")

    const status = await custom.request("/status", postJson({}), { minion: Minion.inMemory() })
    expect(status.status).toBe(200)
  })

  it("drops a removed built-in and shows the custom usage line on 404", async () => {
    const custom = createMinionApp({
      commands: DEFAULT_COMMANDS.filter((command) => command.path !== "/dex"),
      usage: "minion [start|kill|party]",
    })

    const res = await custom.request("/dex", postJson({}), { minion: Minion.inMemory() })

    expect(res.status).toBe(404)
    expect(await res.text()).toContain("minion [start|kill|party]")
  })
})

describe("discord status", () => {
  it("reports the gateway as down through the sandboxed facade, without real network", async () => {
    const minion = Minion.inMemory()
    minion.config.set("discord.token", "x".repeat(20))
    minion.config.set("discord.guildId", "g1")

    const res = await app.request("/discord/status", postJson({}), { minion })
    const text = await res.text()

    expect(text).toContain("xxxx...xxxx")
    expect(text).toContain("gateway: 停止中")
  })

  it("shows the disabled notice when discord.enabled=false", async () => {
    const minion = Minion.inMemory()
    minion.config.set("discord.token", "x".repeat(20))
    minion.config.set("discord.guildId", "g1")
    minion.config.set("discord.enabled", "false")

    const res = await app.request("/discord/status", postJson({}), { minion })

    expect(await res.text()).toContain("無効化されています")
  })
})
