#!/usr/bin/env bun
import { Minion } from "@lib/minion"

const minion = new Minion()
const port = Number(process.env.MINION_GATEWAY_PORT) || undefined

const handle = minion.gatewayServer({ port }).start()

if (handle instanceof Error) {
  console.error(`gateway failed to start: ${handle.message}`)
  process.exit(1)
}

console.log(`gateway listening on :${handle.port}`)
