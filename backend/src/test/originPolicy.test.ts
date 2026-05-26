// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateOriginPolicy } from '../security/originPolicy.js'

describe('origin policy', () => {
  it('allows configured origins', () => {
    assert.deepEqual(
      evaluateOriginPolicy('http://localhost:3000', {
        origins: ['http://localhost:3000'],
      }),
      { allowed: true }
    )
  })

  it('rejects unknown origins', () => {
    assert.deepEqual(
      evaluateOriginPolicy('https://example.com', {
        origins: ['http://localhost:3000'],
      }),
      { allowed: false, reason: 'origin_not_allowed' }
    )
  })

  it('can reject missing origins for WebSocket upgrades', () => {
    assert.deepEqual(
      evaluateOriginPolicy(undefined, {
        origins: ['http://localhost:3000'],
        allowMissingOrigin: false,
      }),
      { allowed: false, reason: 'missing_origin' }
    )
  })

  it('allows all origins when disabled', () => {
    assert.deepEqual(
      evaluateOriginPolicy('https://example.com', {
        enabled: false,
        origins: ['http://localhost:3000'],
      }),
      { allowed: true }
    )
  })

  it('rejects wildcard origins when credentials are enabled', () => {
    assert.throws(
      () => evaluateOriginPolicy('https://example.com', { origins: ['*'], credentials: true }),
      /wildcard origin/
    )
  })
})
