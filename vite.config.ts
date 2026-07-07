import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "cli/src"),
      "@lib": resolve(__dirname, "lib"),
    },
  },
  fmt: {
    semi: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    // electron/ は独立した npm パッケージ(自前の tsconfig + node_modules)。
    // ルートの check に含めると electron/ で npm install していない環境で必ず落ちる。
    ignorePatterns: ["electron/"],
  },
})
