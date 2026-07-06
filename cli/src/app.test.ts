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
})
