// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod } from '../../../types/grpc'
import type { StreamingType } from '../types'
import { MethodKind } from '@grpc-studio/shared'

// ---------------------------------------------------------------------------
// Derive the streaming type label from the method kind
// ---------------------------------------------------------------------------

export function getStreamingType(method: GrpcMethod): StreamingType {
  switch (method.kind) {
    case MethodKind.BIDI_STREAMING:    return 'Bidirectional Stream'
    case MethodKind.SERVER_STREAMING:  return 'Server Stream'
    case MethodKind.CLIENT_STREAMING:  return 'Client Stream'
    default:                           return 'Unary'
  }
}
