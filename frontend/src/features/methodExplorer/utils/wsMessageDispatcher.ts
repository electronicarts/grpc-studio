// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { wsLogger } from '../../../utils/debugLogger'
import type { GrpcStreamMessage } from '../hooks/useGrpcWebSocket'

export interface MessageCallbacks {
  onResponse?: (data: unknown) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

export function dispatchWebSocketMessage(
  event: MessageEvent,
  callbacks: MessageCallbacks,
  setIsStreaming: (v: boolean) => void,
): void {
  try {
    const message: GrpcStreamMessage = JSON.parse(event.data)
    wsLogger.debug('WebSocket message received:', { type: message.type, hasData: message.type === 'response' })

    if (message.type === 'pong') return

    switch (message.type) {
      case 'response':
        callbacks.onResponse?.(message.data)
        break
      case 'error':
        setIsStreaming(false)
        callbacks.onError?.(message.error as string || 'Unknown error')
        break
      case 'complete':
        setIsStreaming(false)
        callbacks.onComplete?.()
        break
    }
  } catch (error) {
    wsLogger.error('Error parsing WebSocket message:', error)
    callbacks.onError?.('Failed to parse server message')
  }
}
