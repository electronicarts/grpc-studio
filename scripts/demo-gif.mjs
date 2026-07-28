#!/usr/bin/env node

// Convert the Playwright walkthrough recording into demo/grpc-studio-light-mode.gif.
//
// Playwright writes per-test videos as .webm under test-results/ when video
// capture is enabled. This script finds the newest .webm and runs ffmpeg to
// produce an optimized GIF. Requires ffmpeg on PATH (`brew install ffmpeg`).
//
// Usage: node scripts/demo-gif.mjs [path/to/video.webm]

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'demo', 'grpc-studio-light-mode.gif')

function fail(message) {
  console.error(`demo-gif: ${message}`)
  process.exit(1)
}

function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
  return !r.error && r.status === 0
}

function findWebms(dir) {
  const found = []
  if (!fs.existsSync(dir)) return found
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.webm')) {
        found.push({ full, mtime: fs.statSync(full).mtimeMs })
      }
    }
  }
  walk(dir)
  return found
}

// Prefer the walkthrough recording (Playwright names the results dir after the
// test title), else fall back to the newest .webm overall.
function findWalkthroughWebm(dir) {
  const webms = findWebms(dir)
  if (webms.length === 0) return null
  const walkthrough = webms
    .filter((w) => /walkthrough/i.test(w.full))
    .sort((a, b) => b.mtime - a.mtime)[0]
  if (walkthrough) return walkthrough.full
  return webms.sort((a, b) => b.mtime - a.mtime)[0].full
}

if (!hasFfmpeg()) {
  fail('ffmpeg not found on PATH. Install it (e.g. `brew install ffmpeg`) and retry.')
}

const input = process.argv[2] ?? findWalkthroughWebm(path.join(ROOT, 'test-results'))
if (!input) {
  fail('No .webm recording found. Run `npm run demo:capture` first (it records video), then rerun this.')
}
if (!fs.existsSync(input)) {
  fail(`Input video not found: ${input}`)
}

console.log(`demo-gif: converting ${input}`)
console.log(`demo-gif: -> ${OUT}`)

// Two-pass palette for a clean GIF at 10fps / 1280px wide. Lower WIDTH/FPS if
// you need a smaller file.
const WIDTH = 1280
const FPS = 10
const filters =
  `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[s0][s1];` +
  `[s0]palettegen[p];[s1][p]paletteuse`
const result = spawnSync(
  'ffmpeg',
  ['-y', '-i', input, '-vf', filters, '-loop', '0', OUT],
  { stdio: 'inherit' },
)

if (result.status !== 0) {
  fail(`ffmpeg exited with code ${result.status ?? 'unknown'}`)
}

console.log('demo-gif: done')
