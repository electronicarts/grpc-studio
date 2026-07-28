// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeRequestMetadata } from '@grpc-studio/shared'

describe('sanitizeRequestMetadata', () => {
  it('accepts and lowercases valid metadata keys', () => {
    const result = sanitizeRequestMetadata({ 'X-Request-Id': 'abc', 'x-tenant': 'acme' })
    assert.equal(result.ok, true)
    assert.deepEqual(result.metadata, { 'x-request-id': 'abc', 'x-tenant': 'acme' })
  })

  it('treats null/undefined as empty metadata', () => {
    assert.deepEqual(sanitizeRequestMetadata(null), { ok: true, metadata: {} })
    assert.deepEqual(sanitizeRequestMetadata(undefined), { ok: true, metadata: {} })
  })

  it('drops entries with an empty key', () => {
    const result = sanitizeRequestMetadata({ '': 'ignored', '  ': 'ignored', 'x-keep': 'yes' })
    assert.equal(result.ok, true)
    assert.deepEqual(result.metadata, { 'x-keep': 'yes' })
  })

  it('rejects non-object input', () => {
    assert.equal(sanitizeRequestMetadata('nope').ok, false)
    assert.equal(sanitizeRequestMetadata(['a', 'b']).ok, false)
    assert.equal(sanitizeRequestMetadata(42).ok, false)
  })

  it('rejects non-string values', () => {
    const result = sanitizeRequestMetadata({ 'x-num': 5 })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /must be a string/)
  })

  it('rejects invalid key characters', () => {
    const result = sanitizeRequestMetadata({ 'bad key': 'value' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /invalid metadata key/)
  })

  it('rejects binary (-bin) metadata keys', () => {
    const result = sanitizeRequestMetadata({ 'x-token-bin': 'AAAA' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /binary metadata key/)
  })

  it('rejects non-ASCII values', () => {
    const result = sanitizeRequestMetadata({ 'x-name': 'café' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /printable ASCII/)
  })

  it('allows the full printable ASCII range in values', () => {
    const result = sanitizeRequestMetadata({ authorization: 'Bearer abc.DEF-123_/=' })
    assert.equal(result.ok, true)
    assert.equal(result.metadata['authorization'], 'Bearer abc.DEF-123_/=')
  })
})
