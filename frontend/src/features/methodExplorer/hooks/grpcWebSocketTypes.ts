// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { InvokeStreamResponse, InvokeStreamStartPayload, JsonValue } from '@grpc-studio/shared'

export type GrpcStreamMessage = InvokeStreamResponse

export interface UseGrpcWebSocketOptions {
  onResponse?: (data: unknown) => void
  onError?: (error: string) => void
  onComplete?: () => void
  onOpen?: () => void
  onClose?: () => void
}

export interface GrpcWebSocketHandle {
  start: (payload: InvokeStreamStartPayload) => void
  sendData: (data: JsonValue) => void
  endStream: () => void
  cancel: () => void
  close: () => void
  isConnected: boolean
  isStreaming: boolean
}
