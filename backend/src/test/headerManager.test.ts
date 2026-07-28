// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { HeaderManager } from '../headers/headerManager.js'
import type { UserContext } from '../types/index.js'

describe('HeaderManager', () => {
  it('keeps auth headers and user headers separate until outbound headers are built', async () => {
    const manager = new HeaderManager({
      getCurrentPlugin: () => ({
        getHeaders: async () => ({ Authorization: 'Bearer jwt-token' }),
      }),
    })
    const userContext: UserContext = {
      userId: 'user-1',
      userEmail: 'ada@example.com',
      userName: 'Ada',
      authenticated: true,
    }

    assert.deepEqual(await manager.getAuthHeaders(), {
      Authorization: 'Bearer jwt-token',
    })
    assert.deepEqual(manager.getUserHeaders(userContext), {
      'x-user-id': 'user-1',
      'x-user-email': 'ada@example.com',
      'x-user-name': 'Ada',
    })
    assert.deepEqual(await manager.getOutboundHeaders(userContext), {
      Authorization: 'Bearer jwt-token',
      'x-user-id': 'user-1',
      'x-user-email': 'ada@example.com',
      'x-user-name': 'Ada',
    })
  })

  it('merges user-supplied request metadata into outbound headers', async () => {
    const manager = new HeaderManager({ getCurrentPlugin: () => null })

    assert.deepEqual(
      await manager.getOutboundHeaders(null, { 'x-request-id': 'abc123', 'x-tenant': 'acme' }),
      { 'x-request-id': 'abc123', 'x-tenant': 'acme' },
    )
  })

  it('lets auth and user headers win over conflicting request metadata', async () => {
    const manager = new HeaderManager({
      getCurrentPlugin: () => ({
        getHeaders: async () => ({ authorization: 'Bearer real-token' }),
      }),
    })
    const userContext: UserContext = {
      userId: 'trusted-user',
      userEmail: null,
      userName: null,
      authenticated: true,
    }

    const headers = await manager.getOutboundHeaders(userContext, {
      authorization: 'Bearer spoofed',
      'x-user-id': 'spoofed-user',
      'x-custom': 'allowed',
    })

    assert.equal(headers['authorization'], 'Bearer real-token')
    assert.equal(headers['x-user-id'], 'trusted-user')
    assert.equal(headers['x-custom'], 'allowed')
  })

  it('drops invalid request metadata entries rather than throwing', () => {
    const manager = new HeaderManager({ getCurrentPlugin: () => null })

    // Empty keys are dropped; invalid keys/values are dropped by returning {}.
    assert.deepEqual(manager.getRequestMetadataHeaders({ '': 'skip', 'x-ok': 'yes' }), { 'x-ok': 'yes' })
    assert.deepEqual(manager.getRequestMetadataHeaders({ 'bad key': 'nope' }), {})
  })
})
