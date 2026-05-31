// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { scheduleReconnect, startHeartbeat, waitForConnection } from '../wsConnectionHelpers'

describe('wsConnectionHelpers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends heartbeat pings only while the socket is open', () => {
    vi.useFakeTimers()
    const ws = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    } as unknown as WebSocket

    const interval = startHeartbeat(ws, 1000)
    vi.advanceTimersByTime(1000)

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
    clearInterval(interval)
  })

  it('schedules reconnects with exponential backoff', () => {
    vi.useFakeTimers()
    const connect = vi.fn()
    const onMaxReached = vi.fn()

    const timeout = scheduleReconnect(3, 10, connect, onMaxReached)
    expect(timeout).not.toBeNull()

    vi.advanceTimersByTime(4000)

    expect(connect).toHaveBeenCalled()
    expect(onMaxReached).not.toHaveBeenCalled()
  })

  it('does not schedule reconnect when max attempts are reached', () => {
    const connect = vi.fn()
    const onMaxReached = vi.fn()

    const timeout = scheduleReconnect(10, 10, connect, onMaxReached)

    expect(timeout).toBeNull()
    expect(connect).not.toHaveBeenCalled()
    expect(onMaxReached).toHaveBeenCalled()
  })

  it('waits for a socket to open', () => {
    vi.useFakeTimers()
    const wsRef = { current: { readyState: WebSocket.CONNECTING } as WebSocket }
    const onReady = vi.fn()
    const onTimeout = vi.fn()

    waitForConnection(wsRef, 1000, onReady, onTimeout)
    vi.advanceTimersByTime(99)
    expect(onReady).not.toHaveBeenCalled()

    wsRef.current = { readyState: WebSocket.OPEN } as WebSocket
    vi.advanceTimersByTime(1)

    expect(onReady).toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('times out if the socket never opens', () => {
    vi.useFakeTimers()
    const wsRef = { current: { readyState: WebSocket.CONNECTING } as WebSocket }
    const onReady = vi.fn()
    const onTimeout = vi.fn()

    waitForConnection(wsRef, 1000, onReady, onTimeout)
    vi.advanceTimersByTime(1000)

    expect(onReady).not.toHaveBeenCalled()
    expect(onTimeout).toHaveBeenCalled()
  })
})
