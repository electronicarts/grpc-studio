// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared method-kind values used by /api/grpc/discover, /api/grpc/invoke,
 * and /ws/grpc stream start messages.
 */
import type { DescMethod } from '@bufbuild/protobuf'

/** The kind of an RPC, exactly as buf's `DescMethod.methodKind` reports it. */
export type MethodKind = DescMethod['methodKind']

export const MethodKind = {
  UNARY: 'unary',
  SERVER_STREAMING: 'server_streaming',
  CLIENT_STREAMING: 'client_streaming',
  BIDI_STREAMING: 'bidi_streaming',
} as const satisfies Record<string, MethodKind>

export type StreamingMethodKind = Exclude<MethodKind, typeof MethodKind.UNARY>

export const METHOD_KINDS = Object.values(MethodKind)
export const STREAMING_METHOD_KINDS = [
  MethodKind.SERVER_STREAMING,
  MethodKind.CLIENT_STREAMING,
  MethodKind.BIDI_STREAMING,
] as const satisfies readonly StreamingMethodKind[]
