const SHORT_FLAGS: Record<string, string> = {
  h: "help",
  v: "version",
}

const GLOBAL_FLAGS = new Set(["help", "version"])

export function toRequest(args: string[]) {
  const segments: string[] = []
  const body: Record<string, string> = {}

  let i = 0
  while (i < args.length) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith("-")) {
        body[key] = next
        i += 2
      } else {
        body[key] = "true"
        i++
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const long = SHORT_FLAGS[arg[1]]
      if (long) body[long] = "true"
      i++
    } else {
      segments.push(arg)
      i++
    }
  }

  const global: Record<string, boolean> = {}
  for (const flag of GLOBAL_FLAGS) {
    if (flag in body) {
      global[flag] = true
      delete body[flag]
    }
  }

  // `/` や `:` を含む値(URLなど)がルーティングを壊さないようエンコードする。Hono がパラメータ取得時にデコードする。
  const path = `/${segments.map(encodeURIComponent).join("/")}`
  return { path, body, global }
}
