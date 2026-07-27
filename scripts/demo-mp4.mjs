#!/usr/bin/env node

// Convert the Playwright walkthrough recording into demo/grpc-studio-light-mode.mp4.
//
// Playwright writes per-test videos as .webm under test-results/ when video
// capture is enabled. This re-encodes the walkthrough recording to a compact
// H.264 MP4 (much smaller than the GIF, and embeddable in the README via a
// <video> tag). Requires ffmpeg on PATH (`brew install ffmpeg`).
//
// Usage: node scripts/demo-mp4.mjs [path/to/video.webm]

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'demo', 'grpc-studio-light-mode.mp4')

function fail(message) {
  console.error(`demo-mp4: ${message}`)
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

console.log(`demo-mp4: converting ${input}`)
console.log(`demo-mp4: -> ${OUT}`)

// H.264 + yuv420p for broad browser/player compatibility. Keep the recording's
// native resolution (the capture is recorded at the full viewport); only force
// even dimensions, which libx264 requires. +faststart moves the moov atom to
// the front so it streams/plays before fully downloading.
const result = spawnSync(
  'ffmpeg',
  [
    '-y', '-i', input,
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', '23', '-preset', 'veryslow', '-movflags', '+faststart',
    '-an', OUT,
  ],
  { stdio: 'inherit' },
)

if (result.status !== 0) {
  fail(`ffmpeg exited with code ${result.status ?? 'unknown'}`)
}

console.log('demo-mp4: done')
