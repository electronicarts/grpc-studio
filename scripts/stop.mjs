#!/usr/bin/env node

// Stop any lingering gRPC Studio dev processes and free the dev ports.
//
// Handy when a previous `npm run dev*` didn't shut down cleanly and the next
// start fails with `EADDRINUSE: address already in use 0.0.0.0:3001`.
//
// Usage:
//   npm run stop                # free the default dev ports + kill dev procs
//   node scripts/stop.mjs 3001  # also free extra ports passed as args
//
// Unix-only (uses `lsof` / `pkill`), which matches this repo's dev setup.

import { spawnSync } from 'node:child_process'
import process from 'node:process'

// Default dev ports: frontend 3000, backend 3001, PetStore 50051, BookStore 50052.
const DEFAULT_PORTS = [3000, 3001, 50051, 50052]
const extraPorts = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0)
const ports = [...new Set([...DEFAULT_PORTS, ...extraPorts])]

// Process-name patterns for dev processes that may not be holding a port yet
// (e.g. a `tsx watch` mid-restart).
const PATTERNS = [
  'tsx watch src/server/httpServer',
  'src/server/httpServer.ts',
  'examples/petstore/src/server.js',
  'examples/bookstore/src/server.js',
]

let killedAny = false

function pidsOnPort(port) {
  const r = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
  if (r.status !== 0 || !r.stdout) return []
  return r.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
}

for (const port of ports) {
  const pids = pidsOnPort(port)
  if (pids.length === 0) continue
  for (const pid of pids) {
    const ok = spawnSync('kill', ['-9', pid]).status === 0
    if (ok) {
      killedAny = true
      console.log(`stop: freed port ${port} (pid ${pid})`)
    }
  }
}

for (const pattern of PATTERNS) {
  // pkill exits 0 when it killed something, 1 when nothing matched.
  const r = spawnSync('pkill', ['-f', pattern])
  if (r.status === 0) {
    killedAny = true
    console.log(`stop: killed processes matching "${pattern}"`)
  }
}

console.log(killedAny ? 'stop: done' : 'stop: nothing to stop — dev ports are already free')
