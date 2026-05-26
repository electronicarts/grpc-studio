// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useMethodExplorerContext } from '../stores'
import { MethodKind } from '@grpc-studio/shared'

/**
 * Single source of truth for the kind of gRPC method currently selected.
 * Derive all method-type flags from here rather than reading clientStreaming /
 * serverStreaming directly in components.
 */
export function useMethodKind() {
  const { selectedMethod } = useMethodExplorerContext()

  const kind = selectedMethod.kind
  const isClientStreaming = kind === MethodKind.CLIENT_STREAMING || kind === MethodKind.BIDI_STREAMING
  const isServerStreaming = kind === MethodKind.SERVER_STREAMING || kind === MethodKind.BIDI_STREAMING
  const isBidirectional = kind === MethodKind.BIDI_STREAMING
  const isAnyStreaming = kind !== MethodKind.UNARY
  const isUnary = kind === MethodKind.UNARY

  /** Server-streaming only (not bidi) */
  const isServerOnly = kind === MethodKind.SERVER_STREAMING
  /** Client-streaming only (not bidi) */
  const isClientOnly = kind === MethodKind.CLIENT_STREAMING

  return {
    isUnary,
    isClientStreaming,
    isServerStreaming,
    isBidirectional,
    isAnyStreaming,
    isServerOnly,
    isClientOnly,
  }
}
