// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { MethodKind } from './methodKind.js'
import type { JsonValue } from './json.js'

/**
 * POST /api/grpc/invoke
 * Request body: unary gRPC method invocation payload.
 * Response body: unary invocation result.
 */
export interface InvokeUnaryRequest {
  service: string
  method: string
  methodKind: typeof MethodKind.UNARY
  /**
   * Protobuf JSON request payload for the selected method.
   * The backend encodes this JSON object to protobuf binary before making the gRPC call.
   */
  data?: JsonValue
}

export interface InvokeUnarySuccessResponse {
  success: true
  /**
   * Protobuf JSON response payload decoded from the gRPC binary response.
   * Field names use proto field names, not generated JavaScript property names.
   */
  data: JsonValue
  completedAtMs: number
}

export interface InvokeUnaryErrorResponse {
  success: false
  error: string
  completedAtMs: number
}

export type InvokeUnaryResponse =
  | InvokeUnarySuccessResponse
  | InvokeUnaryErrorResponse
