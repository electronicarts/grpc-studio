// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AuthManager } from '../auth/authManager.js'
import { authPluginRegistry } from '../auth/authPluginRegistry.js'
import type { AuthConfig } from '../config/schemas/appConfigSchema.js'

describe('AuthManager', () => {
  afterEach(async () => {
    await authPluginRegistry.cleanupAll()
  })

  it('rejects more than one enabled auth plugin', async () => {
    const manager = new AuthManager()
    const config: AuthConfig = {
      plugins: {
        'bearer-token': {
          enabled: true,
          config: { token: 'token' },
        },
        'api-key': {
          enabled: true,
          config: { apiKey: 'key' },
        },
      },
    }

    await assert.rejects(
      () => manager.initialize(config),
      /Only one authentication plugin can be enabled at a time/
    )
  })

  it('uses the none plugin when no auth plugin is enabled', async () => {
    const manager = new AuthManager()
    const config: AuthConfig = {
      plugins: {},
    }
    const warningLines: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warningLines.push(args.map(String).join(' '))
    }

    try {
      await manager.initialize(config)
    } finally {
      console.warn = originalWarn
    }

    assert.equal(manager.getCurrentPluginName(), 'none')
    assert.deepEqual(await manager.getCurrentPlugin()?.getHeaders(), {})
    assert.match(
      warningLines.join('\n'),
      /No outbound authentication plugin configured; using 'none'/
    )
  })

  it('uses the single enabled auth plugin', async () => {
    const manager = new AuthManager()
    const config: AuthConfig = {
      plugins: {
        'bearer-token': {
          enabled: true,
          config: { token: 'token' },
        },
      },
    }

    await manager.initialize(config)

    assert.equal(manager.getCurrentPluginName(), 'bearer-token')
    assert.deepEqual(await manager.getCurrentPlugin()?.getHeaders(), {
      Authorization: 'Bearer token',
    })
  })
})
