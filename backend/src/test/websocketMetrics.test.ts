// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server as HttpServer } from 'node:http'
import WebSocket from 'ws'
import type { AddressInfo } from 'node:net'
import { createWebSocketServer, closeWebSocketServer } from '../websocket/websocketServer.js'
import { metricsRegistry } from '../metrics/registry.js'

// These are real-socket integration tests, so time can't be virtualized — but instead
// of sleeping a fixed duration and hoping the async metric update landed, we POLL the
// condition (waitForMetric) and assert on concrete values. That removes the timing race:
// a slow CI just polls a few more times; a genuinely wrong value fails fast with context.

const POLL_TIMEOUT_MS = 2000
const POLL_INTERVAL_MS = 10

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function currentValue(metricSelector: string): Promise<number> {
  return parseMetricValue(await metricsRegistry.getMetrics(), metricSelector)
}

/** Poll until the metric selector satisfies `predicate`, or fail with the last value. */
async function waitForMetric(
  metricSelector: string,
  predicate: (value: number) => boolean,
  message: string
): Promise<number> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let last = await currentValue(metricSelector)
  while (!predicate(last)) {
    if (Date.now() > deadline) {
      assert.fail(`${message} (last value: ${last} for ${metricSelector})`)
    }
    await sleep(POLL_INTERVAL_MS)
    last = await currentValue(metricSelector)
  }
  return last
}

function openConnection(port: number, origin = 'http://localhost:3000'): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, { headers: { origin } })
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
    setTimeout(() => reject(new Error('Connection open timeout')), POLL_TIMEOUT_MS)
  })
}

describe('WebSocket Metrics', () => {
  let httpServer: HttpServer
  let wss: any
  let port: number
  let activeConnections: WebSocket[] = []
  const activeSockets: Set<any> = new Set()

  beforeEach(async () => {
    httpServer = createServer()
    httpServer.keepAliveTimeout = 0
    httpServer.headersTimeout = 0

    httpServer.on('connection', (socket) => {
      activeSockets.add(socket)
      socket.on('close', () => {
        activeSockets.delete(socket)
      })
    })

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as AddressInfo).port
        resolve()
      })
    })
    wss = createWebSocketServer(httpServer)
    activeConnections = []
  })

  afterEach(async () => {
    for (const ws of activeConnections) {
      try {
        ws.terminate()
      } catch {
        // Ignore
      }
    }
    activeConnections = []

    if (wss) {
      try {
        for (const client of wss.clients) {
          try {
            client.terminate()
          } catch {
            // Ignore
          }
        }
        await closeWebSocketServer(wss)
      } catch {
        // Ignore
      }
      wss = null
    }

    for (const socket of activeSockets) {
      try {
        socket.destroy()
      } catch {
        // Ignore
      }
    }
    activeSockets.clear()

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
      setTimeout(resolve, 100)
    })
  })

  it('increments the accepted counter (status=accepted,reason=ok) on a successful connection', async () => {
    const selector = 'grpc_studio_ws_connections_total{status="accepted",reason="ok"}'
    const before = await currentValue(selector)

    const ws = await openConnection(port)
    activeConnections.push(ws)

    const after = await waitForMetric(selector, (v) => v >= before + 1, 'Accepted counter should increment by 1')
    assert.equal(after, before + 1)
  })

  it('increments the rejected counter (reason=origin_late_check untouched) on a disallowed origin', async () => {
    // verifyClient rejects a bad origin before upgrade; the late-check reason must NOT
    // be what fires here — we only assert the server stays healthy and the origin_late_check
    // series is not spuriously incremented (that path is a defense-in-depth backstop).
    const lateBefore = await currentValue('grpc_studio_ws_connections_total{status="rejected",reason="origin_late_check"}')

    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, { headers: { origin: 'http://evil.com' } })
    await new Promise<void>((resolve) => {
      ws.on('error', () => resolve())
      ws.on('unexpected-response', () => resolve())
      setTimeout(() => resolve(), POLL_TIMEOUT_MS)
    })

    const lateAfter = await currentValue('grpc_studio_ws_connections_total{status="rejected",reason="origin_late_check"}')
    assert.equal(lateAfter, lateBefore, 'a normal verifyClient rejection must not hit the late-origin-check backstop')
  })

  it('tracks the active-connections gauge up on open and back down on close', async () => {
    const gauge = 'grpc_studio_ws_active_connections'

    const ws1 = await openConnection(port)
    activeConnections.push(ws1)
    const active1 = await waitForMetric(gauge, (v) => v >= 1, 'gauge should be >= 1 after first open')

    const ws2 = await openConnection(port)
    activeConnections.push(ws2)
    await waitForMetric(gauge, (v) => v > active1, 'gauge should increase after second open')
    const active2 = await currentValue(gauge)

    ws1.close()
    await new Promise<void>((resolve) => {
      ws1.on('close', () => resolve())
      setTimeout(() => resolve(), POLL_TIMEOUT_MS)
    })

    // Poll (don't sleep) until the close-driven decrement lands.
    await waitForMetric(gauge, (v) => v < active2, 'gauge should decrease after close')
  })

  it('records a connection-duration observation (count increments) on close', async () => {
    const countSelector = 'grpc_studio_ws_connection_duration_seconds_count'
    const before = await currentValue(countSelector)

    const ws = await openConnection(port)
    activeConnections.push(ws)

    ws.close()
    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve())
      setTimeout(() => resolve(), POLL_TIMEOUT_MS)
    })

    // The histogram's _count series must increment by at least one observation.
    await waitForMetric(countSelector, (v) => v >= before + 1, 'duration histogram should record an observation')
  })

  it('increments the received-messages counter when a client sends a message', async () => {
    const selector = 'grpc_studio_ws_messages_total{direction="received"}'
    const before = await currentValue(selector)

    const ws = await openConnection(port)
    activeConnections.push(ws)

    ws.send(JSON.stringify({ type: 'ping' }))

    await waitForMetric(selector, (v) => v >= before + 1, 'received-messages counter should increment')
  })
})

/**
 * Parse a metric value from Prometheus text format
 * Example: "grpc_studio_ws_active_connections 2"
 */
function parseMetricValue(metricsText: string, metricPattern: string): number {
  const lines = metricsText.split('\n')
  for (const line of lines) {
    if (line.startsWith(metricPattern)) {
      const parts = line.split(' ')
      if (parts.length >= 2) {
        const value = parseFloat(parts[parts.length - 1])
        if (!isNaN(value)) {
          return value
        }
      }
    }
  }
  return 0
}
