import { describe, expect, it } from "vitest"
import { app } from "@/app"
import { postJson } from "@/lib/post-json"
import { MemoryMinionFileSystem } from "@lib/engine/fs/memory-file-system"
import { Minion } from "@lib/minion"

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
