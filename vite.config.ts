import { defineConfig } from "vite-plus"

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  fmt: {
    semi: false,
    ignorePatterns: ["dist/"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    // electron/ は独立した npm パッケージ(自前の tsconfig + node_modules)。
    // ルートの check に含めると electron/ で npm install していない環境で必ず落ちる。
    ignorePatterns: ["electron/", "dist/"],
  },
  pack: {
    entry: [
      "lib/index.ts",
      "lib/app.ts",
      "lib/boundaries.ts",
      "lib/collection.ts",
      "lib/config.ts",
      "lib/discord.ts",
      "lib/gateway.ts",
      "lib/stats.ts",
      "lib/engine/gateway/gateway-daemon.ts",
      "cli/src/cli.ts",
      "cli/src/index.ts",
    ],
    format: "esm",
    platform: "node",
    unbundle: true,
    dts: true,
    outDir: "dist",
    tsconfig: "tsconfig.json",
  },
})
