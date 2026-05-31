// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { dispatchWebSocketMessage } from '../wsMessageDispatcher'

function messageEvent(payload: unknown): MessageEvent {
  return new MessageEvent('message', { data: JSON.stringify(payload) })
}

describe('dispatchWebSocketMessage', () => {
  it('routes response messages without ending the stream', () => {
    const onResponse = vi.fn()
    const setIsStreaming = vi.fn()

    dispatchWebSocketMessage(
      messageEvent({ type: 'response', data: { name: 'Ada' }, sentAtMs: 1 }),
      { onResponse },
      setIsStreaming,
    )

    expect(onResponse).toHaveBeenCalledWith({ name: 'Ada' })
    expect(setIsStreaming).not.toHaveBeenCalled()
  })

  it('ends streaming and reports server errors', () => {
    const onError = vi.fn()
    const setIsStreaming = vi.fn()

    dispatchWebSocketMessage(
      messageEvent({ type: 'error', error: 'gRPC Unavailable: offline', sentAtMs: 1 }),
      { onError },
      setIsStreaming,
    )

    expect(setIsStreaming).toHaveBeenCalledWith(false)
    expect(onError).toHaveBeenCalledWith('gRPC Unavailable: offline')
  })

  it('ends streaming and reports completion', () => {
    const onComplete = vi.fn()
    const setIsStreaming = vi.fn()

    dispatchWebSocketMessage(
      messageEvent({ type: 'complete', sentAtMs: 1 }),
      { onComplete },
      setIsStreaming,
    )

    expect(setIsStreaming).toHaveBeenCalledWith(false)
    expect(onComplete).toHaveBeenCalled()
  })

  it('ignores heartbeat pong messages', () => {
    const callbacks = { onResponse: vi.fn(), onError: vi.fn(), onComplete: vi.fn() }
    const setIsStreaming = vi.fn()

    dispatchWebSocketMessage(messageEvent({ type: 'pong', sentAtMs: 1 }), callbacks, setIsStreaming)

    expect(callbacks.onResponse).not.toHaveBeenCalled()
    expect(callbacks.onError).not.toHaveBeenCalled()
    expect(callbacks.onComplete).not.toHaveBeenCalled()
    expect(setIsStreaming).not.toHaveBeenCalled()
  })

  it('reports malformed messages as parse errors', () => {
    const onError = vi.fn()

    dispatchWebSocketMessage(
      new MessageEvent('message', { data: '{' }),
      { onError },
      vi.fn(),
    )

    expect(onError).toHaveBeenCalledWith('Failed to parse server message')
  })
})
