#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const DEFAULT_HOST = 'localhost'
const DEFAULT_CONFIG = path.join('config', 'backend.yaml')
const VALID_MODES = new Set(['plaintext', 'tls', 'mtls'])

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printUsage()
  process.exit(0)
}

if (!options.port) {
  printUsage()
  process.exit(1)
}

const portNumber = Number(options.port)
if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
  fail(`Invalid gRPC port: ${options.port}`)
}

if (!VALID_MODES.has(options.mode)) {
  fail(`Invalid gRPC mode: ${options.mode}. Expected one of: ${[...VALID_MODES].join(', ')}`)
}

const env = {
  ...process.env,
  GRPC_STUDIO_CONFIG: options.config,
  GRPC_TARGET_HOST: options.host,
  GRPC_TARGET_PORT: String(portNumber),
  TARGET_HOST: options.host,
  TARGET_PORT: String(portNumber),
  GRPC_CLIENT_MODE: options.mode,
}

console.log(`gRPC Studio quick start`)
console.log(`Target: ${options.mode}://${options.host}:${portNumber}`)
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
  'npm run dev:backend',
], {
  env,
  stdio: 'inherit',
})

forwardSignal('SIGINT', child)
forwardSignal('SIGTERM', child)

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(signalExitCode(signal))
    return
  }
  process.exit(code ?? 0)
})

function parseArgs(args) {
  const parsed = {
    host: DEFAULT_HOST,
    port: '',
    config: DEFAULT_CONFIG,
    mode: 'plaintext',
    help: false,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      parsed.help = true
      continue
    }

    if (arg === '--host') {
      parsed.host = readValue(args, ++i, arg)
      continue
    }

    if (arg === '--port') {
      parsed.port = readValue(args, ++i, arg)
      continue
    }

    if (arg === '--target') {
      applyTarget(parsed, readValue(args, ++i, arg))
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

    applyTarget(parsed, arg)
  }

  return parsed
}

function applyTarget(parsed, target) {
  if (/^\d+$/.test(target)) {
    parsed.port = target
    return
  }

  const lastColonIndex = target.lastIndexOf(':')
  if (lastColonIndex <= 0 || lastColonIndex === target.length - 1) {
    fail(`Expected target as PORT or HOST:PORT, got: ${target}`)
  }

  parsed.host = target.slice(0, lastColonIndex)
  parsed.port = target.slice(lastColonIndex + 1)
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

Options:
  --target HOST:PORT   gRPC server with reflection enabled
  --host HOST          gRPC server host, defaults to localhost
  --port PORT          gRPC server port
  --mode MODE          plaintext, tls, or mtls. Defaults to plaintext
  --config PATH        backend YAML config. Defaults to config/backend.yaml
`)
}

function fail(message) {
  console.error(`quickstart: ${message}`)
  console.error('')
  printUsage()
  process.exit(1)
}
