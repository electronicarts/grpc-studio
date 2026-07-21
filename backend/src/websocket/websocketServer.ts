// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { randomUUID } from 'node:crypto'
import type { IncomingHttpHeaders, Server } from 'node:http'
import { WebSocket, WebSocketServer, type VerifyClientCallbackAsync } from 'ws'
import configManager from '../config/configManager.js'
import { getUserContextFromHeaders } from '../middlewares/userContextMiddleware.js'
import { evaluateOriginPolicy } from '../security/originPolicy.js'
import logger from '../utils/logger.js'
import { wsActiveConnections, wsConnectionsTotal, wsConnectionDuration } from '../metrics/metrics.js'
import { WebSocketConnection } from './websocketConnection.js'
import * as websocketProtocol from './websocketProtocol.js'

const serverLogger = logger.child({ module: 'websocket-server' })
const WEBSOCKET_PATH = '/ws/grpc'

const connections = new Map<string, WebSocketConnection>()

interface LiveWebSocket extends WebSocket {
  isAlive: boolean
}

type PingableWebSocketServer = WebSocketServer & { pingInterval: NodeJS.Timeout }

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const serverConfig = configManager.getServerConfig()

  serverLogger.info('Creating WebSocket server')
  const wss = new WebSocketServer({
    server: httpServer,
    path: WEBSOCKET_PATH,
    maxPayload: serverConfig.websocket.maxPayloadBytes,
    verifyClient: verifyWebSocketOrigin,
  })

  startHeartbeat(wss, serverConfig.websocket.heartbeatIntervalMs)
  wss.on('connection', (ws, request) => {
    acceptConnection(ws as LiveWebSocket, request.headers, request.url)
  })
  wss.on('error', (error) => {
    serverLogger.error('WebSocket server error', { error: error.message })
  })

  serverLogger.info('WebSocket server created')
  return wss
}

export function closeWebSocketServer(wss: WebSocketServer | null): Promise<void> {
  if (!wss) return Promise.resolve()

  serverLogger.info('Closing WebSocket server')

  const pingable = wss as Partial<PingableWebSocketServer>
  if (pingable.pingInterval) {
    clearInterval(pingable.pingInterval)
  }

  closeAllConnections()

  return new Promise((resolve) => {
    wss.close(() => {
      serverLogger.info('WebSocket server closed')
      resolve()
    })
  })
}

const verifyWebSocketOrigin: VerifyClientCallbackAsync = (info, callback) => {
  const decision = evaluateOriginPolicy(info.origin, {
    ...configManager.getServerConfig().cors,
    allowMissingOrigin: false,
  })

  // Early rejection before any connection setup
  if (!decision.allowed) {
    if (decision.reason === 'missing_origin') {
      serverLogger.warn('Rejecting WebSocket connection without origin header', {
        remoteAddress: info.req.socket.remoteAddress
      })
    } else {
      serverLogger.warn('Rejecting WebSocket connection from disallowed origin', {
        origin: info.origin,
        remoteAddress: info.req.socket.remoteAddress
      })
    }

    // Reject synchronously before ws library proceeds
    callback(false, 403, 'CORS policy violation')
    return
  }

  // Only proceed if explicitly allowed
  callback(true)
}

function acceptConnection(ws: LiveWebSocket, headers: IncomingHttpHeaders, path: string | undefined): void {
  const connectionId = randomUUID()

  serverLogger.info('New WebSocket connection', {
    connectionId,
    path,
    origin: headers.origin,
  })

  // Defense in depth: Double-check origin even if verifyClient passed
  const decision = evaluateOriginPolicy(headers.origin, {
    ...configManager.getServerConfig().cors,
    allowMissingOrigin: false,
  })

  if (!decision.allowed) {
    serverLogger.error('Connection accepted despite failing origin check - security issue', {
      connectionId,
      origin: headers.origin,
      reason: decision.reason,
    })
    websocketProtocol.sendError(ws, 'Policy violation')
    ws.close(1008, 'Policy violation')
    wsConnectionsTotal.inc({ status: 'rejected', reason: 'origin_late_check' })
    return
  }

  if (isAtCapacity()) {
    rejectAtCapacity(ws, connectionId)
    wsConnectionsTotal.inc({ status: 'rejected', reason: 'at_capacity' })
    return
  }

  trackHeartbeat(ws)

  const connection = new WebSocketConnection({
    connectionId,
    ws,
    userContext: getUserContextFromHeaders(headers),
    maxMessageSize: configManager.getServerConfig().websocket.maxPayloadBytes,
  })

  const connectedAt = process.hrtime.bigint()

  // Register event handlers BEFORE adding to map to prevent race condition
  ws.on('close', () => {
    wsConnectionDuration.observe({}, Number(process.hrtime.bigint() - connectedAt) / 1e9)
    closeConnection(connectionId)
  })
  ws.on('error', (error) => {
    serverLogger.error('WebSocket error', { connectionId, error: error.message })
    closeConnection(connectionId)
  })

  // Now add to map and open connection
  connections.set(connectionId, connection)
  wsActiveConnections.inc()
  wsConnectionsTotal.inc({ status: 'accepted', reason: 'ok' })
  connection.open()

  serverLogger.info('WebSocket connection opened', { connectionId })
}

function isAtCapacity(): boolean {
  return connections.size >= configManager.getServerConfig().websocket.maxConnections
}

function rejectAtCapacity(ws: WebSocket, connectionId: string): void {
  serverLogger.warn('Max connections reached, rejecting WebSocket connection', {
    connectionId,
    current: connections.size,
  })
  websocketProtocol.sendError(ws, 'Server at capacity, please try again later')
  ws.close(1013, 'Try again later')
}

function closeConnection(connectionId: string): void {
  const connection = connections.get(connectionId)
  if (!connection) return

  connections.delete(connectionId)
  wsActiveConnections.dec()
  connection.close()
  serverLogger.info('WebSocket connection closed', { connectionId })
}

function closeAllConnections(): void {
  serverLogger.info('Closing all WebSocket connections', { count: connections.size })

  for (const connection of [...connections.values()]) {
    connection.close()
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close()
    }
  }

  connections.clear()
  wsActiveConnections.set(0)
  serverLogger.info('Closed all WebSocket connections')
}

function startHeartbeat(wss: WebSocketServer, intervalMs: number): void {
  const pingInterval = setInterval(() => {
    for (const client of wss.clients) {
      try {
        const ws = client as LiveWebSocket
        if (ws.isAlive === false) {
          serverLogger.warn('Terminating stale WebSocket connection')
          ws.terminate()
          continue
        }

        ws.isAlive = false
        ws.ping()
      } catch (error) {
        serverLogger.error('Error pinging WebSocket client', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }, intervalMs)

  pingInterval.unref()
  const pingable = wss as PingableWebSocketServer
  pingable.pingInterval = pingInterval

  wss.on('close', () => {
    clearInterval(pingInterval)
  })
}

function trackHeartbeat(ws: LiveWebSocket): void {
  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })
}
