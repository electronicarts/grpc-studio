// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClientError } from '../apiClient'

// ── helpers ──────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  })
}

// ── unit tests ────────────────────────────────────────────────────────────────

describe('ApiClientError', () => {
  it('should store code, status, and details', () => {
    const err = new ApiClientError('Not found', 'NOT_FOUND', 404, { resource: 'user' })
    expect(err.message).toBe('Not found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.status).toBe(404)
    expect(err.details).toEqual({ resource: 'user' })
    expect(err.name).toBe('ApiClientError')
    expect(err).toBeInstanceOf(Error)
  })

  it('isCertificateExpired() returns true only for CERTIFICATE_EXPIRED code', () => {
    expect(new ApiClientError('expired', 'CERTIFICATE_EXPIRED').isCertificateExpired()).toBe(true)
    expect(new ApiClientError('other', 'OTHER').isCertificateExpired()).toBe(false)
    expect(new ApiClientError('no code').isCertificateExpired()).toBe(false)
  })

  it('isGrpcError() returns true when message starts with "gRPC "', () => {
    expect(new ApiClientError('gRPC NotFound: resource missing').isGrpcError()).toBe(true)
    expect(new ApiClientError('HTTP 500').isGrpcError()).toBe(false)
  })
})

// ── integration-style tests using fetch mock ─────────────────────────────────

describe('ApiClient.request', () => {
  // We test the parseErrorResponse logic end-to-end by driving real ApiClient
  // instances with a mocked global fetch.
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('unwraps the standard backend envelope { success, data }', async () => {
    global.fetch = mockFetch({ success: true, data: { id: 1 }, timestamp: '2026' }) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    const result = await apiClient.request<{ id: number }>('/test', 'GET')
    expect(result).toEqual({ id: 1 })
  })

  it('returns raw response when envelope is absent', async () => {
    global.fetch = mockFetch({ name: 'raw' }) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    const result = await apiClient.request<{ name: string }>('/test', 'GET')
    expect(result).toEqual({ name: 'raw' })
  })

  it('throws ApiClientError on 4xx with structured error body', async () => {
    global.fetch = mockFetch({ error: 'Unauthorized' }, 401) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    await expect(apiClient.request('/test', 'GET')).rejects.toBeInstanceOf(ApiClientError)
  })

  it('throws ApiClientError with CERTIFICATE_EXPIRED code', async () => {
    global.fetch = mockFetch({ code: 'CERTIFICATE_EXPIRED', message: 'cert expired' }, 403) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    try {
      await apiClient.request('/test', 'GET')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError)
      expect((err as ApiClientError).isCertificateExpired()).toBe(true)
    }
  })

  it('returns empty object for empty response body', async () => {
    global.fetch = mockFetch('') as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    const result = await apiClient.request('/test', 'GET')
    expect(result).toEqual({})
  })

  it('parses gRPC error format from error string', async () => {
    global.fetch = mockFetch({ error: 'Code: NotFound Message: item not found' }, 404) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    try {
      await apiClient.request('/test', 'GET')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError)
      expect((err as ApiClientError).message).toContain('gRPC NotFound')
      expect((err as ApiClientError).isGrpcError()).toBe(true)
    }
  })

  it('throws on HTML error pages', async () => {
    global.fetch = mockFetch('<!DOCTYPE html><html>502 Bad Gateway</html>', 502) as unknown as typeof fetch
    const { apiClient } = await import('../apiClient')
    try {
      await apiClient.request('/test', 'GET')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError)
      expect((err as ApiClientError).message).toContain('Backend unreachable')
    }
  })
})
