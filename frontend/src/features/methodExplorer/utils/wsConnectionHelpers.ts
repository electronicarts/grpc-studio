// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { buildApiUrl } from '../../../config'
import { wsLogger } from '../../../utils/debugLogger'

export function getWebSocketUrl(): string {
  const apiUrl = buildApiUrl('config')
  const baseUrl = apiUrl.replace(/\/api\/grpc\/config$/, '')
  return `${baseUrl.replace(/^http/, 'ws')}/ws/grpc`
}

export function startHeartbeat(ws: WebSocket, intervalMs = 15000): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, intervalMs)
}

export function scheduleReconnect(
  attempt: number,
  maxAttempts: number,
  connect: () => void,
  onMaxReached: () => void,
): ReturnType<typeof setTimeout> | null {
  if (attempt >= maxAttempts) {
    wsLogger.error('Max reconnection attempts reached')
    onMaxReached()
    return null
  }

  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000)
  wsLogger.debug(`Reconnecting (attempt ${attempt}/${maxAttempts}) in ${delay}ms`)
  return setTimeout(connect, delay)
}

/**
 * Waits for a WebSocket to reach OPEN state, then calls onReady.
 * Calls onTimeout if the connection doesn't open within timeoutMs.
 */
export function waitForConnection(
  wsRef: { current: WebSocket | null },
  timeoutMs: number,
  onReady: () => void,
  onTimeout: () => void,
): void {
  let cleared = false

  const poll = setInterval(() => {
    if (cleared) return
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      cleared = true
      clearInterval(poll)
      clearTimeout(timeout)
      onReady()
    }
  }, 100)

  const timeout = setTimeout(() => {
    if (!cleared) {
      cleared = true
      clearInterval(poll)
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        onTimeout()
      }
    }
  }, timeoutMs)
}
