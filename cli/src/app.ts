import { factory } from "@/factory"
import { onError } from "@/on-error"
import configGet from "@/routes/config/get/[key]/route"
import configList from "@/routes/config/list/route"
import configSet from "@/routes/config/set/[key]/[value]/route"
import dev from "@/routes/dev/route"
import kill from "@/routes/kill/route"
import { notFound } from "@/routes/not-found"
import reboot from "@/routes/reboot/route"
import start from "@/routes/start/route"
import status from "@/routes/status/route"

const base = factory.createApp()
base.onError(onError)
base.notFound(notFound)

export const app = base
  .post("/start", ...start)
  .post("/dev", ...dev)
  .post("/kill", ...kill)
  .post("/reboot", ...reboot)
  .post("/status", ...status)
  .post("/config/list", ...configList)
  .post("/config/get/:key", ...configGet)
  .post("/config/set/:key/:value", ...configSet)

export type AppType = typeof app
