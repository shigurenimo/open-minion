import { describe, expect, it } from "vitest"
import { readGatewaySnapshot, type MinionFetch } from "./gateway-probe"

function fetchReturning(body: unknown, init: { ok?: boolean; status?: number } = {}): MinionFetch {
  return async () => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  })
}

describe("readGatewaySnapshot", () => {
  it("returns the parsed snapshot from a healthy gateway", async () => {
    const snapshot = await readGatewaySnapshot({
      fetchFn: fetchReturning({
        sessions: [
          { id: "a", state: "running", clipIndex: 2, name: "repo" },
          { id: "discord:u1", state: "running", clipIndex: 7, name: "Alice", activity: "gaming" },
        ],
      }),
    })

    expect(snapshot).not.toBeInstanceOf(Error)
    if (snapshot instanceof Error) return
    expect(snapshot.sessions).toHaveLength(2)
    expect(snapshot.sessions[1]?.activity).toBe("gaming")
  })

  it("returns an Error when the gateway answers non-200", async () => {
    const result = await readGatewaySnapshot({
      fetchFn: fetchReturning({}, { ok: false, status: 500 }),
    })

    expect(result).toBeInstanceOf(Error)
    if (result instanceof Error) expect(result.message).toContain("500")
  })

  it("returns an Error when the response is not a snapshot", async () => {
    const result = await readGatewaySnapshot({ fetchFn: fetchReturning({ nope: true }) })

    expect(result).toBeInstanceOf(Error)
  })

  it("converts a rejected fetch (nothing listening) into an Error value", async () => {
    const result = await readGatewaySnapshot({
      fetchFn: () => Promise.reject(new Error("connection refused")),
    })

    expect(result).toBeInstanceOf(Error)
    if (result instanceof Error) expect(result.message).toBe("connection refused")
  })
})
