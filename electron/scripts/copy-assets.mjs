// スプライトシートの正本は swift/Sources/open-minion/Resources/ChickBlue.png。
// 二重管理を避けるため、ビルドのたびにそこから assets/ へコピーする。
import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const source = join(
  here,
  "..",
  "..",
  "swift",
  "Sources",
  "open-minion",
  "Resources",
  "ChickBlue.png",
)
const destDir = join(here, "..", "assets")

mkdirSync(destDir, { recursive: true })
copyFileSync(source, join(destDir, "ChickBlue.png"))
console.log("copied ChickBlue.png -> assets/")
