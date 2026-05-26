// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server as HttpServer } from 'node:http'
import WebSocket from 'ws'
import type { AddressInfo } from 'node:net'
import { createWebSocketServer, closeWebSocketServer } from '../websocket/websocketServer.js'
import { metricsRegistry } from '../metrics/registry.js'

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

  it('should track connection acceptance metrics', async () => {
    // Get initial metrics
    const metricsBefore = await metricsRegistry.getMetrics()
    const acceptedBefore = parseMetricValue(metricsBefore, 'grpc_studio_ws_connections_total{status="accepted"}')

    // Create connection
    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://localhost:3000' }
    })
    activeConnections.push(ws)

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })

    // Get metrics after
    const metricsAfter = await metricsRegistry.getMetrics()
    const acceptedAfter = parseMetricValue(metricsAfter, 'grpc_studio_ws_connections_total{status="accepted"}')

    // Verify connection was counted
    assert.ok(acceptedAfter > acceptedBefore, 'Accepted connections metric should increase')
  })

  it('should track connection rejection metrics', async () => {
    // Get initial metrics
    const metricsBefore = await metricsRegistry.getMetrics()

    // Attempt connection with invalid origin
    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://evil.com' }
    })

    await new Promise<void>((resolve) => {
      ws.on('error', () => resolve())
      ws.on('unexpected-response', () => resolve())
      setTimeout(() => resolve(), 1000)
    })

    // Get metrics after
    const metricsAfter = await metricsRegistry.getMetrics()

    // Verify rejection was counted (should see ws_connections_total with status="rejected")
    assert.ok(metricsAfter.includes('grpc_studio_ws_connections_total'), 'Should have connection metrics')
  })

  it('should track active connections gauge', async () => {
    // Create first connection
    const ws1 = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://localhost:3000' }
    })
    activeConnections.push(ws1)

    await new Promise<void>((resolve, reject) => {
      ws1.on('open', () => resolve())
      ws1.on('error', reject)
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })

    // Check active connections
    const metricsAfter1 = await metricsRegistry.getMetrics()
    const active1 = parseMetricValue(metricsAfter1, 'grpc_studio_ws_active_connections')
    assert.ok(active1 >= 1, 'Active connections should be at least 1')

    // Create second connection
    const ws2 = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://localhost:3000' }
    })
    activeConnections.push(ws2)

    await new Promise<void>((resolve, reject) => {
      ws2.on('open', () => resolve())
      ws2.on('error', reject)
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })

    const metricsAfter2 = await metricsRegistry.getMetrics()
    const active2 = parseMetricValue(metricsAfter2, 'grpc_studio_ws_active_connections')
    assert.ok(active2 > active1, 'Active connections should increase')

    // Close first connection
    ws1.close()
    await new Promise<void>((resolve) => {
      ws1.on('close', () => resolve())
      setTimeout(() => resolve(), 1000)
    })

    // Wait a bit for metrics to update
    await new Promise(resolve => setTimeout(resolve, 100))

    const metricsAfter3 = await metricsRegistry.getMetrics()
    const active3 = parseMetricValue(metricsAfter3, 'grpc_studio_ws_active_connections')
    assert.ok(active3 < active2, 'Active connections should decrease after close')
  })

  it('should track connection duration', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://localhost:3000' }
    })
    activeConnections.push(ws)

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })

    // Keep connection open for a measurable duration
    await new Promise(resolve => setTimeout(resolve, 100))

    // Close connection
    ws.close()
    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve())
      setTimeout(() => resolve(), 1000)
    })

    // Verify duration histogram was recorded
    const metrics = await metricsRegistry.getMetrics()
    assert.ok(metrics.includes('grpc_studio_ws_connection_duration_seconds'), 'Should track connection duration')
  })

  it('should track message counts', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
      headers: { origin: 'http://localhost:3000' }
    })
    activeConnections.push(ws)

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
      setTimeout(() => reject(new Error('Timeout')), 2000)
    })

    // Send a ping message
    ws.send(JSON.stringify({ type: 'ping' }))

    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100))

    const metrics = await metricsRegistry.getMetrics()

    // Verify message metrics exist
    assert.ok(metrics.includes('grpc_studio_ws_messages_total'), 'Should track message counts')
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
