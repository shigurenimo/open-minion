import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite-plus"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "cli/src"),
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
  },
})
