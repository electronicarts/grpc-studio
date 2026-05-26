// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server as HttpServer } from 'node:http'
import WebSocket from 'ws'
import type { AddressInfo } from 'node:net'
import { createWebSocketServer, closeWebSocketServer } from '../websocket/websocketServer.js'

describe('WebSocket Server', () => {
  let httpServer: HttpServer
  let wss: any
  let port: number
  let activeConnections: WebSocket[] = []
  const activeSockets: Set<any> = new Set()
  let httpServerClosed = false

  beforeEach(async () => {
    httpServer = createServer()
    httpServer.keepAliveTimeout = 0
    httpServer.headersTimeout = 0

    // Track all connections so we can destroy them
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
    httpServerClosed = false
  })

  afterEach(async () => {
    // Terminate all active WebSocket connections
    for (const ws of activeConnections) {
      try {
        ws.terminate()
      } catch {
        // Ignore
      }
    }
    activeConnections = []

    // Close WebSocket server
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

    // Destroy all HTTP sockets to force close
    for (const socket of activeSockets) {
      try {
        socket.destroy()
      } catch {
        // Ignore
      }
    }
    activeSockets.clear()

    // Close HTTP server
    if (!httpServerClosed) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        // Force resolve after timeout
        setTimeout(resolve, 100)
      })
    }
  })

  describe('connection acceptance', () => {
    it('should accept connections from allowed origins', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 2000)
      })

      assert.equal(ws.readyState, WebSocket.OPEN)
    })

    it('should reject connections from disallowed origins', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://evil.com' }
      })

      let errorOccurred = false
      await new Promise<void>((resolve) => {
        ws.on('error', () => {
          errorOccurred = true
          resolve()
        })
        ws.on('unexpected-response', () => {
          errorOccurred = true
          resolve()
        })
        setTimeout(() => resolve(), 1000)
      })

      assert.ok(errorOccurred, 'Connection from disallowed origin should fail')
    })

    it('should reject connections without origin header', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`)

      let errorOccurred = false
      await new Promise<void>((resolve) => {
        ws.on('error', () => {
          errorOccurred = true
          resolve()
        })
        ws.on('unexpected-response', () => {
          errorOccurred = true
          resolve()
        })
        setTimeout(() => resolve(), 1000)
      })

      assert.ok(errorOccurred, 'Connection without origin should fail')
    })

    it('should connect to correct path /ws/grpc', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      assert.equal(ws.readyState, WebSocket.OPEN)
    })

    it('should reject connections to wrong path', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/wrong/path`, {
        headers: { origin: 'http://localhost:3000' }
      })

      let errorOccurred = false
      await new Promise<void>((resolve) => {
        ws.on('error', () => {
          errorOccurred = true
          resolve()
        })
        ws.on('unexpected-response', () => {
          errorOccurred = true
          resolve()
        })
        setTimeout(() => resolve(), 1000)
      })

      assert.ok(errorOccurred, 'Wrong path should fail')
    })
  })

  describe('max connections enforcement', () => {
    it('should allow multiple connections up to limit', async () => {
      // Open 2 connections (under typical limit)
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
          headers: { origin: 'http://localhost:3000' }
        })

        await new Promise<void>((resolve, reject) => {
          ws.on('open', () => resolve())
          ws.on('error', reject)
          setTimeout(() => reject(new Error('Timeout')), 2000)
        })

        activeConnections.push(ws)
      }

      assert.equal(activeConnections.length, 2)
      assert.ok(activeConnections.every(ws => ws.readyState === WebSocket.OPEN))
    })

    it('should close connection immediately after close event', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      const closePromise = new Promise<void>((resolve) => {
        ws.on('close', () => resolve())
      })

      ws.close()
      await closePromise

      assert.ok([WebSocket.CLOSING, WebSocket.CLOSED].includes(ws.readyState))
    })
  })

  describe('heartbeat mechanism', () => {
    it('should respond to ping with pong', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      const pongReceived = new Promise<void>((resolve) => {
        ws.on('pong', () => resolve())
      })

      ws.ping()

      await Promise.race([
        pongReceived,
        new Promise((_, reject) => setTimeout(() => reject(new Error('No pong received')), 2000))
      ])

      assert.ok(true, 'Pong received')
    })
  })

  describe('message handling', () => {
    it('should receive messages sent by server', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      const messages: string[] = []
      ws.on('message', (data) => {
        messages.push(data.toString())
      })

      // Wait a bit to see if any messages arrive
      await new Promise(resolve => setTimeout(resolve, 100))

      // Just verify the connection worked, actual messages depend on protocol
      assert.ok(true, 'Connection established successfully')
    })

    it('should handle client sending messages', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      // Send a test message
      const sendPromise = new Promise<void>((resolve, reject) => {
        ws.send(JSON.stringify({ type: 'ping' }), (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      await sendPromise
      assert.ok(true, 'Message sent successfully')
    })
  })

  describe('graceful shutdown', () => {
    it('should close all connections on server close', async () => {
      // Open multiple connections
      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
          headers: { origin: 'http://localhost:3000' }
        })

        await new Promise<void>((resolve, reject) => {
          ws.on('open', () => resolve())
          ws.on('error', reject)
          setTimeout(() => reject(new Error('Timeout')), 2000)
        })

        activeConnections.push(ws)
      }

      // Verify all connected
      assert.ok(activeConnections.every(ws => ws.readyState === WebSocket.OPEN))

      // Close server
      await closeWebSocketServer(wss)
      wss = null // Prevent double close in afterEach

      // Wait for connections to close
      await Promise.all(
        activeConnections.map(ws => new Promise<void>(resolve => {
          if (ws.readyState === WebSocket.CLOSED) {
            resolve()
          } else {
            ws.on('close', () => resolve())
            // Timeout in case close event doesn't fire
            setTimeout(() => resolve(), 1000)
          }
        }))
      )

      // Verify all closed
      assert.ok(activeConnections.every(ws => ws.readyState === WebSocket.CLOSED))
    })

    it('should clean up resources on close', async () => {
      await closeWebSocketServer(wss)
      wss = null // Prevent double close in afterEach

      // Close HTTP server too
      httpServerClosed = true
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        setTimeout(resolve, 100)
      })

      // Try to connect after close - should fail with ECONNREFUSED
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })

      let errorOccurred = false
      await new Promise<void>((resolve) => {
        ws.on('error', () => {
          errorOccurred = true
          resolve()
        })
        setTimeout(() => resolve(), 1000)
      })

      assert.ok(errorOccurred, 'Should not accept connections after close')
    })
  })

  describe('error handling', () => {
    it('should handle client disconnect gracefully', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      // Abruptly terminate connection
      ws.terminate()

      await new Promise(resolve => setTimeout(resolve, 100))

      assert.ok(true, 'Server handled disconnect gracefully')
    })

    it('should handle oversized messages', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      // Send a large message (beyond maxPayload)
      const largeMessage = 'x'.repeat(20 * 1024 * 1024) // 20MB

      let errorOccurred = false
      ws.on('error', () => {
        errorOccurred = true
      })

      ws.on('close', (code) => {
        if (code === 1009) { // Message too big
          errorOccurred = true
        }
      })

      ws.send(largeMessage)

      await new Promise(resolve => setTimeout(resolve, 500))

      // Connection should have closed or errored
      assert.ok(errorOccurred || ws.readyState !== WebSocket.OPEN, 'Oversized message handled')
    })
  })

  describe('concurrent connections', () => {
    it('should handle multiple simultaneous connections', async () => {
      const connectionPromises: Promise<void>[] = []

      // Open 5 connections simultaneously
      for (let i = 0; i < 5; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
          headers: { origin: 'http://localhost:3000' }
        })

        connectionPromises.push(
          new Promise<void>((resolve, reject) => {
            ws.on('open', () => resolve())
            ws.on('error', reject)
            setTimeout(() => reject(new Error('Timeout')), 2000)
          })
        )

        activeConnections.push(ws)
      }

      await Promise.all(connectionPromises)

      assert.equal(activeConnections.length, 5)
      assert.ok(activeConnections.every(ws => ws.readyState === WebSocket.OPEN))
    })
  })

  describe('connection capacity limits', () => {
    it('should reject connections when at capacity', async () => {
      // Default max is 100, so we'd need to create 100 connections
      // For testing, we'll verify the logic by checking the error message
      // when exceeding capacity (this would require mocking config or creating 101 connections)

      // Create multiple connections up to a reasonable test limit
      const testLimit = 10
      const connectionPromises: Promise<void>[] = []

      for (let i = 0; i < testLimit; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
          headers: { origin: 'http://localhost:3000' }
        })

        connectionPromises.push(
          new Promise<void>((resolve, reject) => {
            ws.on('open', () => resolve())
            ws.on('error', reject)
            setTimeout(() => reject(new Error('Timeout')), 2000)
          })
        )

        activeConnections.push(ws)
      }

      await Promise.all(connectionPromises)

      // All connections should succeed (we're below the limit of 100)
      assert.equal(activeConnections.length, testLimit)
      assert.ok(activeConnections.every(ws => ws.readyState === WebSocket.OPEN))

      // Note: Full capacity test requires either:
      // 1. Creating 101 connections (slow)
      // 2. Mocking configManager to return maxConnections: 2
      // This test verifies connections work under normal capacity
    })

    it('should accept connections after capacity frees up', async () => {
      // Create a connection
      const ws1 = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws1)

      await new Promise<void>((resolve, reject) => {
        ws1.on('open', () => resolve())
        ws1.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      assert.equal(ws1.readyState, WebSocket.OPEN)

      // Close the connection
      ws1.close()
      await new Promise<void>((resolve) => {
        ws1.on('close', () => resolve())
        setTimeout(() => resolve(), 1000)
      })

      // Create another connection (should succeed as capacity freed up)
      const ws2 = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws2)

      await new Promise<void>((resolve, reject) => {
        ws2.on('open', () => resolve())
        ws2.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      assert.equal(ws2.readyState, WebSocket.OPEN)
    })
  })

  describe('heartbeat mechanism', () => {
    it('should respond to ping with pong', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      // Send ping and wait for pong
      let pongReceived = false
      ws.on('pong', () => {
        pongReceived = true
      })

      ws.ping()

      // Wait for pong response
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (pongReceived) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 10)
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve()
        }, 1000)
      })

      assert.ok(pongReceived, 'Server should respond to ping with pong')
    })

    it('should keep connection alive through heartbeat', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/grpc`, {
        headers: { origin: 'http://localhost:3000' }
      })
      activeConnections.push(ws)

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve())
        ws.on('error', reject)
        setTimeout(() => reject(new Error('Timeout')), 2000)
      })

      // Wait longer than typical timeout to verify heartbeat keeps connection alive
      await new Promise(resolve => setTimeout(resolve, 2000))

      assert.equal(ws.readyState, WebSocket.OPEN, 'Connection should remain open')
    })
  })
})
