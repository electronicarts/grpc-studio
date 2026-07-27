// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { StreamingMethodKind } from './methodKind.js'
import type { JsonValue } from './json.js'

export interface InvokeStreamUserHeaders {
  'X-User-Id'?: string
  'X-User-Email'?: string
  'X-User-Name'?: string
}

/**
 * WS /ws/grpc
 * Request message: client-to-server stream control envelope.
 * Response message: server-to-client stream events.
 */
export interface InvokeStreamStartPayload {
  /**
   * Target server name (from config).
   */
  target: string
  service: string
  method: string
  methodKind: StreamingMethodKind
  /**
   * Optional first protobuf JSON request payload to write immediately after opening the stream.
   * The backend encodes this JSON object to protobuf binary before writing to gRPC.
   */
  data?: JsonValue
  /**
   * Browser WebSocket clients cannot set custom headers on the upgrade request,
   * so the start frame carries the same trusted user headers HTTP requests use.
   */
  userHeaders?: InvokeStreamUserHeaders
}

export interface InvokeStreamPingRequest {
  type: 'ping'
}

export interface InvokeStreamStartRequest {
  type: 'start'
  payload: InvokeStreamStartPayload
}

export interface InvokeStreamDataRequest {
  type: 'data'
  /**
   * Protobuf JSON request payload for a client-streaming or bidi-streaming write.
   * The backend encodes this JSON object to protobuf binary before writing to gRPC.
   */
  payload: JsonValue
}

export interface InvokeStreamEndRequest {
  type: 'end'
}

export interface InvokeStreamCancelRequest {
  type: 'cancel'
}

export type InvokeStreamClientMessage =
  | InvokeStreamPingRequest
  | InvokeStreamStartRequest
  | InvokeStreamDataRequest
  | InvokeStreamEndRequest
  | InvokeStreamCancelRequest

export interface InvokeStreamDataResponse {
  type: 'response'
  /**
   * Protobuf JSON response payload decoded from gRPC binary stream data.
   * Field names use proto field names, not generated JavaScript property names.
   */
  data: JsonValue
  sentAtMs: number
}

export interface InvokeStreamErrorResponse {
  type: 'error'
  error: unknown
  sentAtMs: number
}

export interface InvokeStreamCompleteResponse {
  type: 'complete'
  sentAtMs: number
}

export interface InvokeStreamPongResponse {
  type: 'pong'
  sentAtMs: number
}

export type InvokeStreamResponse =
  | InvokeStreamDataResponse
  | InvokeStreamErrorResponse
  | InvokeStreamCompleteResponse
  | InvokeStreamPongResponse
