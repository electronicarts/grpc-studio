// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Integration tests - full HTTP request/response cycles through the Express app.
 * Tests the real middleware stack, routing, and response envelope.
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { createExpressApp } from '../app.js'
import type { Application } from 'express'

let app: Application
let server: Server
let baseUrl: string

async function startServer(): Promise<void> {
  app = createExpressApp()
  server = createServer(app)
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number }
      baseUrl = `http://127.0.0.1:${addr.port}`
      resolve()
    })
  })
}

async function stopServer(): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

async function get(path: string, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, { headers })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}

async function post(path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}

async function getRawMetrics(): Promise<string> {
  const res = await fetch(`${baseUrl}/metrics`)
  return res.text()
}

describe('Integration: HTTP API', () => {
  beforeEach(startServer)
  afterEach(stopServer)

  describe('GET /', () => {
    it('returns root response with standard envelope', async () => {
      const res = await get('/')

      assert.equal(res.status, 200)
      assert.equal(res.body.success, true)
      assert.equal(res.body.data.name, 'gRPC Studio API')
      assert.equal(res.body.data.status, 'running')
      assert.equal(typeof res.body.data.version, 'string')
      assert.equal(typeof res.body.timestamp, 'number')
    })
  })

  describe('GET /health', () => {
    it('returns health status', async () => {
      const res = await get('/health')

      assert.equal(res.status, 200)
      assert.equal(res.body.status, 'healthy')
      assert.equal(typeof res.body.uptime, 'number')
    })
  })

  describe('GET /ready', () => {
    it('returns readiness status', async () => {
      const res = await get('/ready')

      assert.equal(res.status, 200)
      assert.equal(res.body.status, 'ready')
    })
  })

  describe('GET /live', () => {
    it('returns liveness status', async () => {
      const res = await get('/live')

      assert.equal(res.status, 200)
      assert.equal(res.body.status, 'alive')
    })
  })

  describe('GET /api/grpc/config', () => {
    it('returns config with standard envelope', async () => {
      const res = await get('/api/grpc/config')

      assert.equal(res.status, 200)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.config !== undefined)
    })
  })

  describe('POST /api/grpc/invoke', () => {
    it('rejects missing required fields with 400', async () => {
      const res = await post('/api/grpc/invoke', {})

      assert.equal(res.status, 400)
    })

    it('rejects non-unary method kinds with 400', async () => {
      const res = await post('/api/grpc/invoke', {
        service: 'test.Service',
        method: 'StreamMethod',
        methodKind: 'server_streaming',
        data: {},
      })

      assert.equal(res.status, 400)
    })
  })

  describe('POST /api/grpc/descriptor-set', () => {
    it('rejects missing messageType with 400', async () => {
      const res = await post('/api/grpc/descriptor-set', {})

      assert.equal(res.status, 400)
    })
  })

  describe('404 handling', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await get('/api/nonexistent')

      assert.equal(res.status, 404)
    })
  })

  describe('Security headers', () => {
    it('includes helmet security headers', async () => {
      const res = await get('/')

      assert.ok(res.headers.get('x-content-type-options'))
    })
  })

  describe('CORS', () => {
    it('allows configured origins', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      })

      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000')
    })

    it('rejects unconfigured origins', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://evil.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      assert.notEqual(res.headers.get('access-control-allow-origin'), 'http://evil.com')
    })
  })
})

describe('Integration: Prometheus Metrics', () => {
  beforeEach(startServer)
  afterEach(stopServer)

  /** Parse a specific counter value from Prometheus text output. */
  function getCounterValue(metrics: string, name: string, labels: Record<string, string>): number {
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')
    const line = metrics.split('\n').find((l) => l.startsWith(name) && l.includes(labelStr))
    return line ? parseFloat(line.split(' ').pop()!) : 0
  }

  it('exposes /metrics endpoint in Prometheus format', async () => {
    const metrics = await getRawMetrics()

    assert.equal(typeof metrics, 'string')
  })

  it('increments http_requests_total counter on each request', async () => {
    const before = await getRawMetrics()
    const countBefore = getCounterValue(before, 'grpc_studio_http_requests_total', { method: 'GET', path: '/', status: '200' })

    await get('/')
    await get('/')

    const after = await getRawMetrics()
    const countAfter = getCounterValue(after, 'grpc_studio_http_requests_total', { method: 'GET', path: '/', status: '200' })

    assert.equal(countAfter - countBefore, 2, 'Expected counter to increment by 2')
  })

  it('records http_request_duration_seconds histogram', async () => {
    await get('/')

    const metrics = await getRawMetrics()

    assert.match(metrics, /grpc_studio_http_request_duration_seconds_bucket/)
    assert.match(metrics, /grpc_studio_http_request_duration_seconds_sum/)
    assert.match(metrics, /grpc_studio_http_request_duration_seconds_count/)
  })

  it('records error metrics for 4xx responses', async () => {
    const before = await getRawMetrics()
    const errorsBefore = getCounterValue(before, 'grpc_studio_http_errors_total', { error_type: 'client_error' })

    await post('/api/grpc/invoke', {})

    const after = await getRawMetrics()
    const errorsAfter = getCounterValue(after, 'grpc_studio_http_errors_total', { error_type: 'client_error' })

    assert.ok(errorsAfter > errorsBefore, 'Expected error counter to increment')
  })

  it('tracks separate counters for different paths', async () => {
    // Note: /health, /ready, /live are registered before the metrics middleware
    // and are therefore not instrumented.  Use two paths that ARE metered.
    const before = await getRawMetrics()
    const rootBefore = getCounterValue(before, 'grpc_studio_http_requests_total', { method: 'GET', path: '/' })
    const configBefore = getCounterValue(before, 'grpc_studio_http_requests_total', { method: 'GET', path: '/api/grpc/config' })

    await get('/')
    await get('/api/grpc/config')

    const after = await getRawMetrics()
    const rootAfter = getCounterValue(after, 'grpc_studio_http_requests_total', { method: 'GET', path: '/' })
    const configAfter = getCounterValue(after, 'grpc_studio_http_requests_total', { method: 'GET', path: '/api/grpc/config' })

    assert.equal(rootAfter - rootBefore, 1)
    assert.equal(configAfter - configBefore, 1)
  })

  it('duration histogram has expected buckets', async () => {
    await get('/')

    const metrics = await getRawMetrics()

    // HTTP buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    assert.match(metrics, /grpc_studio_http_request_duration_seconds_bucket\{.*le="0\.001"/)
    assert.match(metrics, /grpc_studio_http_request_duration_seconds_bucket\{.*le="5"/)
    assert.match(metrics, /grpc_studio_http_request_duration_seconds_bucket\{.*le="\+Inf"/)
  })

  it('does not record metrics for the /metrics endpoint itself', async () => {
    // Fetch metrics twice - the scrape itself should not be measured
    await getRawMetrics()
    const metrics = await getRawMetrics()

    // There should be no counter for path="/metrics"
    const metricsPathLine = metrics
      .split('\n')
      .find((l) => l.startsWith('grpc_studio_http_requests_total') && l.includes('path="/metrics"'))

    assert.equal(metricsPathLine, undefined, '/metrics endpoint should not be self-instrumented')
  })

  it('records latency within reasonable range', async () => {
    const before = await getRawMetrics()
    const sumBefore = getCounterValue(before, 'grpc_studio_http_request_duration_seconds_sum', { method: 'GET', path: '/' })
    const cntBefore = getCounterValue(before, 'grpc_studio_http_request_duration_seconds_count', { method: 'GET', path: '/' })

    await get('/')

    const after = await getRawMetrics()
    const sumAfter = getCounterValue(after, 'grpc_studio_http_request_duration_seconds_sum', { method: 'GET', path: '/' })
    const cntAfter = getCounterValue(after, 'grpc_studio_http_request_duration_seconds_count', { method: 'GET', path: '/' })

    const latency = sumAfter - sumBefore
    const count = cntAfter - cntBefore
    assert.equal(count, 1, 'Expected exactly 1 new observation')
    assert.ok(latency > 0, 'Latency should be positive')
    assert.ok(latency < 1, 'A simple GET / should complete in under 1 second')
  })
})
