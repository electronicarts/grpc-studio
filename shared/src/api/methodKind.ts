// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared method-kind values used by /api/grpc/discover, /api/grpc/invoke,
 * and /ws/grpc stream start messages.
 */
export const MethodKind = {
  UNARY: 'unary',
  SERVER_STREAMING: 'server_streaming',
  CLIENT_STREAMING: 'client_streaming',
  BIDI_STREAMING: 'bidi_streaming',
} as const

export type MethodKind = typeof MethodKind[keyof typeof MethodKind]
export type StreamingMethodKind = Exclude<MethodKind, typeof MethodKind.UNARY>

export const METHOD_KINDS = Object.values(MethodKind)
export const STREAMING_METHOD_KINDS = [
  MethodKind.SERVER_STREAMING,
  MethodKind.CLIENT_STREAMING,
  MethodKind.BIDI_STREAMING,
] as const satisfies readonly StreamingMethodKind[]
