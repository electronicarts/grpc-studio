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
})
