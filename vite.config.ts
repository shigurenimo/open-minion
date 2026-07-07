import { defineConfig } from "vite-plus"

export default defineConfig({
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
