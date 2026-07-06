import { describe, expect, it } from "vitest"
import { toRequest } from "@/router"

describe("toRequest", () => {
  it("parses segments only", () => {
    const { path, body } = toRequest(["status"])
    expect(path).toBe("/status")
    expect(body).toEqual({})
  })

  it("parses nested segments", () => {
    const { path } = toRequest(["config", "list"])
    expect(path).toBe("/config/list")
  })

  it("parses positional args as path segments", () => {
    const { path } = toRequest(["config", "set", "greeting", "hello"])
    expect(path).toBe("/config/set/greeting/hello")
  })

  it("parses long flags into body", () => {
    const { body } = toRequest(["dev", "--force", "true"])
    expect(body.force).toBe("true")
  })

  it("treats a trailing flag with no value as boolean", () => {
    const { body } = toRequest(["dev", "--force"])
    expect(body.force).toBe("true")
  })

  it("parses short flag -h into global help", () => {
    const { global, body } = toRequest(["start", "-h"])
    expect(global.help).toBe(true)
    expect(body.help).toBeUndefined()
  })

  it("parses short flag -v into global version", () => {
    const { global, body } = toRequest(["-v"])
    expect(global.version).toBe(true)
    expect(body.version).toBeUndefined()
  })

  it("extracts --help out of body into global", () => {
    const { global, body } = toRequest(["start", "--help"])
    expect(global.help).toBe(true)
    expect(body.help).toBeUndefined()
  })

  it("returns root path for no args", () => {
    const { path } = toRequest([])
    expect(path).toBe("/")
  })
})
