#!/usr/bin/env node
// The published `minion` bin — the default assembly of the reusable runner.
// To build your own CLI (extra commands, different Minion wiring), see
// `@shigureni/minion/cli`: createMinionApp() + runMinionCli().
import { runMinionCli } from "./run.ts"

await runMinionCli()
