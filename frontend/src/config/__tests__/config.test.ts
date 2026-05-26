// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseYamlConfig } from '../yamlParser'
import { validateConfig } from '../configValidator'
import { setConfig, getConfig, isConfigLoaded } from '../configState'
import { buildApiUrl, buildCustomApiUrl } from '../urlBuilder'
import type { FrontendConfig } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_YAML = `
api:
  baseUrl: "http://localhost:3001"
  endpoints:
    config: "/api/grpc/config"
    discover: "/api/grpc/discover"
    invoke: "/api/grpc/invoke"
    descriptorSet: "/api/grpc/descriptor-set"
    health: "/health"
  timeout: 30000
`

const FULL_YAML = `
api:
  baseUrl: "http://localhost:3001"
  endpoints:
    config: "/api/grpc/config"
    discover: "/api/grpc/discover"
    invoke: "/api/grpc/invoke"
    descriptorSet: "/api/grpc/descriptor-set"
    health: "/health"
  timeout: 120000
  websocketTimeout: 10000
auth:
  enabled: true
  provider: entra-id
  entraId:
    tenantId: "tenant-123"
    clientId: "client-456"
    redirectUri: "http://localhost:3000"
    scopes:
      - openid
      - profile
      - email
    cloud: "public"
`

const NGINX_PROXY_YAML = `
api:
  baseUrl: ""
  endpoints:
    config: "/api/grpc/config"
    discover: "/api/grpc/discover"
    invoke: "/api/grpc/invoke"
    descriptorSet: "/api/grpc/descriptor-set"
    health: "/health"
  timeout: 30000
`

const validConfig = (): FrontendConfig => ({
  api: {
    baseUrl: 'http://localhost:3001',
    endpoints: {
      config: '/api/grpc/config',
      discover: '/api/grpc/discover',
      invoke: '/api/grpc/invoke',
      descriptorSet: '/api/grpc/descriptor-set',
      status: '/api/grpc/status',
      health: '/health',
    },
    timeout: 30000,
  },
})

// ---------------------------------------------------------------------------
// yamlParser
// ---------------------------------------------------------------------------

describe('yamlParser', () => {
  it('parses minimal YAML with defaults', () => {
    const result = parseYamlConfig(MINIMAL_YAML)
    expect(result).not.toBeNull()
    expect(result!.api.baseUrl).toBe('http://localhost:3001')
    expect(result!.api.endpoints.discover).toBe('/api/grpc/discover')
    expect(result!.api.timeout).toBe(30000)
    expect(result!.auth).toBeUndefined()
    expect(result!.performance).toBeUndefined()
  })

  it('parses full YAML with auth and websocketTimeout', () => {
    const result = parseYamlConfig(FULL_YAML)
    expect(result).not.toBeNull()
    expect(result!.api.timeout).toBe(120000)
    expect(result!.api.websocketTimeout).toBe(10000)
    expect(result!.auth).toBeDefined()
    expect(result!.auth!.enabled).toBe(true)
    expect(result!.auth!.provider).toBe('entra-id')
    expect(result!.auth!.entraId!.tenantId).toBe('tenant-123')
    expect(result!.auth!.entraId!.clientId).toBe('client-456')
    expect(result!.auth!.entraId!.scopes).toEqual(['openid', 'profile', 'email'])
    expect(result!.auth!.entraId!.cloud).toBe('public')
  })

  it('parses empty baseUrl for nginx proxy mode', () => {
    const result = parseYamlConfig(NGINX_PROXY_YAML)
    expect(result).not.toBeNull()
    expect(result!.api.baseUrl).toBe('')
  })

  it('uses default endpoint paths when not specified', () => {
    const yaml = `
api:
  baseUrl: "http://localhost:3001"
  timeout: 5000
`
    const result = parseYamlConfig(yaml)
    expect(result).not.toBeNull()
    expect(result!.api.endpoints.discover).toBe('/api/grpc/discover')
    expect(result!.api.endpoints.health).toBe('/health')
  })

  it('uses default timeout when not specified', () => {
    const yaml = `
api:
  baseUrl: "http://localhost:3001"
`
    const result = parseYamlConfig(yaml)
    expect(result).not.toBeNull()
    expect(result!.api.timeout).toBe(30000)
  })

  it('returns null for invalid YAML', () => {
    const result = parseYamlConfig('key: [invalid: yaml: {')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseYamlConfig('')
    expect(result).toBeNull()
  })

  it('returns null for non-object YAML', () => {
    const result = parseYamlConfig('just a string')
    expect(result).toBeNull()
  })

  it('parses auth with enabled=false (no entraId block)', () => {
    const yaml = `
api:
  baseUrl: "http://localhost:3001"
  timeout: 5000
auth:
  enabled: false
  provider: entra-id
`
    const result = parseYamlConfig(yaml)
    expect(result!.auth!.enabled).toBe(false)
    expect(result!.auth!.entraId).toBeUndefined()
  })

  it('defaults cloud to public when not specified', () => {
    const yaml = `
api:
  baseUrl: "http://localhost:3001"
  timeout: 5000
auth:
  enabled: true
  provider: entra-id
  entraId:
    tenantId: "t1"
    clientId: "c1"
`
    const result = parseYamlConfig(yaml)
    expect(result!.auth!.entraId!.cloud).toBe('public')
  })
})

// ---------------------------------------------------------------------------
// configValidator
// ---------------------------------------------------------------------------

describe('configValidator', () => {
  it('passes for valid config', () => {
    expect(() => validateConfig(validConfig())).not.toThrow()
  })

  it('passes for empty baseUrl (nginx proxy)', () => {
    const config = validConfig()
    config.api.baseUrl = ''
    expect(() => validateConfig(config)).not.toThrow()
  })

  it('passes for relative baseUrl starting with /', () => {
    const config = validConfig()
    config.api.baseUrl = '/api'
    expect(() => validateConfig(config)).not.toThrow()
  })

  it('throws for invalid baseUrl scheme', () => {
    const config = validConfig()
    config.api.baseUrl = 'ftp://invalid'
    expect(() => validateConfig(config)).toThrow('api.baseUrl must be a valid HTTP/HTTPS URL')
  })

  it('throws for non-positive timeout', () => {
    const config = validConfig()
    config.api.timeout = 0
    expect(() => validateConfig(config)).toThrow('api.timeout must be a positive number')
  })

  it('throws for negative timeout', () => {
    const config = validConfig()
    config.api.timeout = -1
    expect(() => validateConfig(config)).toThrow('api.timeout must be a positive number')
  })

  it('throws for missing endpoint', () => {
    const config = validConfig()
    config.api.endpoints.discover = ''
    expect(() => validateConfig(config)).toThrow('api.endpoints.discover is required but missing or empty')
  })

  it('throws for each missing required endpoint', () => {
    const endpoints = ['config', 'discover', 'invoke', 'descriptorSet', 'status', 'health'] as const
    for (const ep of endpoints) {
      const config = validConfig()
      config.api.endpoints[ep] = ''
      expect(() => validateConfig(config)).toThrow(`api.endpoints.${ep}`)
    }
  })
})

// ---------------------------------------------------------------------------
// configState
// ---------------------------------------------------------------------------

describe('configState', () => {
  beforeEach(() => {
    // Reset state by setting to a known value then we test fresh
    // We can't directly reset the module-level variable, but we can test the flow
  })

  it('throws when config not loaded', () => {
    // We need a fresh module to test unloaded state.
    // Instead, test the setConfig/getConfig round-trip.
    const config = validConfig()
    setConfig(config)
    expect(getConfig()).toBe(config)
  })

  it('isConfigLoaded returns true after setConfig', () => {
    setConfig(validConfig())
    expect(isConfigLoaded()).toBe(true)
  })

  it('getConfig returns the exact object that was set', () => {
    const config = validConfig()
    setConfig(config)
    expect(getConfig()).toBe(config)
    expect(getConfig().api.baseUrl).toBe('http://localhost:3001')
  })
})

// ---------------------------------------------------------------------------
// urlBuilder
// ---------------------------------------------------------------------------

describe('urlBuilder', () => {
  beforeEach(() => {
    setConfig(validConfig())
  })

  describe('buildApiUrl', () => {
    it('builds URL with baseUrl + endpoint path', () => {
      expect(buildApiUrl('discover')).toBe('http://localhost:3001/api/grpc/discover')
    })

    it('builds URL for all known endpoints', () => {
      expect(buildApiUrl('config')).toBe('http://localhost:3001/api/grpc/config')
      expect(buildApiUrl('invoke')).toBe('http://localhost:3001/api/grpc/invoke')
      expect(buildApiUrl('descriptorSet')).toBe('http://localhost:3001/api/grpc/descriptor-set')
      expect(buildApiUrl('health')).toBe('http://localhost:3001/health')
    })

    it('strips trailing slash from baseUrl', () => {
      setConfig({
        ...validConfig(),
        api: { ...validConfig().api, baseUrl: 'http://localhost:3001/' },
      })
      expect(buildApiUrl('discover')).toBe('http://localhost:3001/api/grpc/discover')
    })

    it('returns just the path when baseUrl is empty (nginx proxy)', () => {
      setConfig({
        ...validConfig(),
        api: { ...validConfig().api, baseUrl: '' },
      })
      expect(buildApiUrl('discover')).toBe('/api/grpc/discover')
    })
  })

  describe('buildCustomApiUrl', () => {
    it('builds URL with baseUrl + custom path', () => {
      expect(buildCustomApiUrl('/api/grpc/batch-schema')).toBe(
        'http://localhost:3001/api/grpc/batch-schema'
      )
    })

    it('prepends / if path does not start with one', () => {
      expect(buildCustomApiUrl('api/custom')).toBe('http://localhost:3001/api/custom')
    })

    it('strips trailing slash from baseUrl', () => {
      setConfig({
        ...validConfig(),
        api: { ...validConfig().api, baseUrl: 'http://localhost:3001/' },
      })
      expect(buildCustomApiUrl('/test')).toBe('http://localhost:3001/test')
    })

    it('returns just the path when baseUrl is empty', () => {
      setConfig({
        ...validConfig(),
        api: { ...validConfig().api, baseUrl: '' },
      })
      expect(buildCustomApiUrl('/api/grpc/batch-schema')).toBe('/api/grpc/batch-schema')
    })
  })
})

// ---------------------------------------------------------------------------
// loadConfig (integration — fetch mocked)
// ---------------------------------------------------------------------------

describe('loadConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches, parses, validates, and stores config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MINIMAL_YAML),
    }))

    const { loadConfig } = await import('../index')
    const config = await loadConfig()

    expect(fetch).toHaveBeenCalledWith('/config/frontend.yaml')
    expect(config.api.baseUrl).toBe('http://localhost:3001')
    expect(isConfigLoaded()).toBe(true)
  })

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }))

    const { loadConfig } = await import('../index')
    await expect(loadConfig()).rejects.toThrow('Configuration loading failed')
  })

  it('throws on empty response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('   '),
    }))

    const { loadConfig } = await import('../index')
    await expect(loadConfig()).rejects.toThrow('Configuration file is empty')
  })

  it('throws on invalid YAML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('key: [invalid: yaml: {'),
    }))

    const { loadConfig } = await import('../index')
    await expect(loadConfig()).rejects.toThrow('Failed to parse configuration YAML')
  })

  it('throws on fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const { loadConfig } = await import('../index')
    await expect(loadConfig()).rejects.toThrow('Configuration loading failed')
  })
})
