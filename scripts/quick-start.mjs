#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import yaml from 'js-yaml'

const DEFAULT_HOST = 'localhost'
const DEFAULT_CONFIG = path.join('config', 'backend.yaml')
const VALID_MODES = new Set(['plaintext', 'tls', 'mtls'])

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printUsage()
  process.exit(0)
}

if (options.targets.length === 0) {
  printUsage()
  process.exit(1)
}

// Validate and normalize every target (fill defaults, auto-name unnamed ones).
const targets = options.targets.map((target, index) => normalizeTarget(target, index, options.mode))

// Generate a temp config with exactly these targets, based on the chosen base config.
const configPath = writeTempConfig(options.config, targets)

const env = {
  ...process.env,
  GRPC_STUDIO_CONFIG: configPath,
}

console.log(`gRPC Studio quick start`)
console.log(`Targets:`)
for (const t of targets) {
  console.log(`  - ${t.name}: ${t.mode}://${t.host}:${t.port}`)
}
console.log(`Config:   ${configPath} (generated from ${options.config})`)
console.log(`Frontend: http://localhost:3000`)
console.log(`Backend:  http://localhost:3001`)
console.log('')

runChecked(npmCommand, ['run', 'build:shared'], { env })

const child = spawn(npmCommand, [
  'exec',
  'concurrently',
  '--',
  '--kill-others-on-fail',
  '--names',
  'frontend,backend',
  '--prefix-colors',
  'cyan,magenta',
  'npm run dev:frontend',
  // Run the backend's own dev script so the generated config is honored.
  // The root `dev:backend` script hardcodes GRPC_STUDIO_CONFIG, which would
  // override the env var we set above.
  `${npmCommand} --prefix backend run dev`,
], {
  env,
  stdio: 'inherit',
})

forwardSignal('SIGINT', child)
forwardSignal('SIGTERM', child)

child.on('exit', (code, signal) => {
  cleanupTempConfig(configPath)
  if (signal) {
    process.exit(signalExitCode(signal))
    return
  }
  process.exit(code ?? 0)
})

function parseArgs(args) {
  const parsed = {
    targets: [],
    config: DEFAULT_CONFIG,
    mode: 'plaintext',
    help: false,
  }

  // Legacy single-target flags (--host / --port) are collected here and folded
  // into one target after parsing, so old invocations keep working.
  let legacyHost
  let legacyPort

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      parsed.help = true
      continue
    }

    if (arg === '--target') {
      parsed.targets.push(parseTargetSpec(readValue(args, ++i, arg)))
      continue
    }

    if (arg === '--host') {
      legacyHost = readValue(args, ++i, arg)
      continue
    }

    if (arg === '--port') {
      legacyPort = readValue(args, ++i, arg)
      continue
    }

    if (arg === '--config') {
      parsed.config = readValue(args, ++i, arg)
      continue
    }

    if (arg === '--mode') {
      parsed.mode = readValue(args, ++i, arg)
      continue
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`)
    }

    // Bare positional argument — treated as a target (PORT or HOST:PORT).
    parsed.targets.push(parseTargetSpec(arg))
  }

  if (legacyHost !== undefined || legacyPort !== undefined) {
    parsed.targets.push({ host: legacyHost ?? DEFAULT_HOST, port: legacyPort })
  }

  return parsed
}

// Parse a --target value: "[name=]HOST:PORT" or "[name=]PORT", with optional
// trailing ",mode=MODE" / ",name=NAME" parts.
function parseTargetSpec(value) {
  const parts = value.split(',')
  const target = {}

  parts.forEach((part, index) => {
    const eqIndex = part.indexOf('=')
    const key = eqIndex > 0 ? part.slice(0, eqIndex) : ''

    if (key === 'mode' || key === 'name' || key === 'host' || key === 'port') {
      target[key] = part.slice(eqIndex + 1)
      return
    }

    // Otherwise this part is the address, optionally prefixed with "name=".
    if (index !== 0) {
      fail(`Unexpected target segment: ${part}`)
    }

    let address = part
    if (eqIndex > 0) {
      target.name = part.slice(0, eqIndex)
      address = part.slice(eqIndex + 1)
    }
    applyAddress(target, address)
  })

  return target
}

function applyAddress(target, address) {
  if (/^\d+$/.test(address)) {
    target.port = address
    return
  }

  const lastColonIndex = address.lastIndexOf(':')
  if (lastColonIndex <= 0 || lastColonIndex === address.length - 1) {
    fail(`Expected target as PORT or HOST:PORT, got: ${address}`)
  }

  target.host = address.slice(0, lastColonIndex)
  target.port = address.slice(lastColonIndex + 1)
}

function normalizeTarget(target, index, defaultMode) {
  const host = target.host ?? DEFAULT_HOST
  const mode = target.mode ?? defaultMode
  const name = target.name ?? `Quickstart Target ${index + 1}`

  if (target.port === undefined || target.port === '') {
    fail(`Target "${name}" is missing a port`)
  }

  const portNumber = Number(target.port)
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    fail(`Invalid gRPC port for "${name}": ${target.port}`)
  }

  if (!VALID_MODES.has(mode)) {
    fail(`Invalid gRPC mode for "${name}": ${mode}. Expected one of: ${[...VALID_MODES].join(', ')}`)
  }

  if (mode === 'mtls') {
    fail(`mTLS target "${name}" needs client certificate paths, which quickstart cannot supply.\n` +
      `  Write a backend YAML with security.clientCertPath/clientKeyPath and run:\n` +
      `    cd backend && GRPC_STUDIO_CONFIG=../path/to/config.yaml npm run dev`)
  }

  return { name, host, port: portNumber, mode }
}

// Read the base config, swap in exactly the requested targets, and write it to
// a temp file. This avoids the indexed GRPC_TARGET_<i>_* env overrides, which
// merge by index and would leave stray targets from the base config in place.
function writeTempConfig(baseConfigPath, targets) {
  let base = {}
  try {
    base = yaml.load(fs.readFileSync(baseConfigPath, 'utf8')) ?? {}
  } catch (error) {
    fail(`Could not read base config ${baseConfigPath}: ${error.message}`)
  }

  base.client = { ...(base.client ?? {}), targets }

  const tempPath = path.join(os.tmpdir(), `grpc-studio-quickstart-${process.pid}.yaml`)
  try {
    fs.writeFileSync(tempPath, yaml.dump(base), 'utf8')
  } catch (error) {
    fail(`Could not write temp config: ${error.message}`)
  }
  return tempPath
}

function cleanupTempConfig(tempPath) {
  try {
    fs.rmSync(tempPath, { force: true })
  } catch {
    // Best effort — the OS will clean the temp dir eventually.
  }
}

function readValue(args, index, optionName) {
  const value = args[index]
  if (!value || value.startsWith('--')) {
    fail(`Missing value for ${optionName}`)
  }
  return value
}

function runChecked(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    stdio: 'inherit',
  })

  if (result.error) {
    fail(result.error.message)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function forwardSignal(signal, child) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal)
    }
  })
}

function signalExitCode(signal) {
  const signalNumbers = {
    SIGHUP: 1,
    SIGINT: 2,
    SIGTERM: 15,
  }
  return 128 + (signalNumbers[signal] ?? 0)
}

function printUsage() {
  console.log(`Usage:
  npm run quickstart -- 50051
  npm run quickstart -- localhost:50051
  npm run quickstart -- --target localhost:50051 --mode tls

Multiple targets (each appears in the UI's server selector):
  npm run quickstart -- 50051 50052
  npm run quickstart -- \\
    --target localhost:50051 \\
    --target payments=payments.example.com:443,mode=tls

Options:
  --target [NAME=]HOST:PORT[,mode=MODE]   Add a gRPC target (repeatable)
  --host HOST                            gRPC server host (default: localhost)
  --port PORT                            gRPC server port
  --mode MODE                            Default mode for targets without one:
                                         plaintext or tls (default: plaintext)
  --config PATH                          Base backend YAML config (default: config/backend.yaml)

A temp config is generated from the base config with exactly the targets you
specify. Bare positional arguments (PORT or HOST:PORT) are treated as targets.
For mTLS (which needs client cert paths), write a backend YAML and run the
backend directly with GRPC_STUDIO_CONFIG instead.
`)
}

function fail(message) {
  console.error(`quickstart: ${message}`)
  console.error('')
  printUsage()
  process.exit(1)
}
