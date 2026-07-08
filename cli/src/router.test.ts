import { describe, expect, it } from "vitest"
import { toRequest } from "@/cli/src/router.ts"

describe("toRequest", () => {
  it("parses segments only", () => {
    const request = toRequest(["status"])
    expect(request.path).toBe("/status")
    expect(request.body).toEqual({})
  })

  it("parses nested segments", () => {
    const request = toRequest(["config", "list"])
    expect(request.path).toBe("/config/list")
  })

  it("parses positional args as path segments", () => {
    const request = toRequest(["config", "set", "greeting", "hello"])
    expect(request.path).toBe("/config/set/greeting/hello")
  })

  it("URL-encodes segments so values containing / or : keep routing intact", () => {
    const request = toRequest(["config", "set", "url", "https://example.com"])
    expect(request.path).toBe("/config/set/url/https%3A%2F%2Fexample.com")
  })

  it("parses long flags into body", () => {
    const request = toRequest(["dev", "--force", "true"])
    expect(request.body.force).toBe("true")
  })

  it("treats a trailing flag with no value as boolean", () => {
    const request = toRequest(["dev", "--force"])
    expect(request.body.force).toBe("true")
  })

  it("parses short flag -h into global help", () => {
    const request = toRequest(["start", "-h"])
    expect(request.global.help).toBe(true)
    expect(request.body.help).toBeUndefined()
  })

  it("parses short flag -v into global version", () => {
    const request = toRequest(["-v"])
    expect(request.global.version).toBe(true)
    expect(request.body.version).toBeUndefined()
  })

  it("extracts --help out of body into global", () => {
    const request = toRequest(["start", "--help"])
    expect(request.global.help).toBe(true)
    expect(request.body.help).toBeUndefined()
  })

  it("returns root path for no args", () => {
    const request = toRequest([])
    expect(request.path).toBe("/")
  })
})
