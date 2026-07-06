#!/usr/bin/env bun
import { app } from "@/app"
import { postJson } from "@/lib/post-json"
import { toRequest } from "@/router"
import { Minion } from "@lib/minion"

import pkg from "../../package.json" with { type: "json" }

const minion = new Minion()
const env = { minion }

const HELP = `minion - open-minion CLI

Usage:
  minion [command] [options]
  minion <command> -h          Show help for a command

Commands:
  start                     起動する (デフォルト)
  dev                       停止してデバッグビルドで起動し直す
  kill                      停止する
  reboot                    停止してリリースビルドで起動し直す
  status                    起動状況を表示する
  dex                       実績とミニオン図鑑を表示する
  config list               設定値を一覧表示する
  config get <key>          設定値を取得する
  config set <key> <value>  設定値を書き込む

Global flags:
  -h, --help     Show help
  -v, --version  Show version`

const argv = process.argv.slice(2)
const args = argv.length === 0 ? ["start"] : argv

const request = toRequest(args)

if (request.global.version) {
  console.log(pkg.version)
  process.exit()
}

if (request.global.help) {
  if (request.path === "/") {
    console.log(HELP)
    process.exit()
  }

  const helpResponse = await app.request(
    request.path,
    postJson({ ...request.body, help: "true" }),
    env,
  )
  console.log(helpResponse.ok ? await helpResponse.text() : HELP)
  process.exit()
}

try {
  const response = await app.request(request.path, postJson(request.body), env)
  const text = await response.text()

  if (!response.ok) {
    console.error(text || `Error ${response.status}`)
    process.exit(1)
  }

  console.log(text)
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err))
  console.error(error.message)
  process.exit(1)
}
