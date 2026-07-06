#!/usr/bin/env bun
import { Minion } from "@lib/minion"

const minion = new Minion()
const port = Number(process.env.MINION_GATEWAY_PORT) || undefined

const handle = minion.gatewayServer({ port }).start()

console.log(`gateway listening on :${handle.port}`)
