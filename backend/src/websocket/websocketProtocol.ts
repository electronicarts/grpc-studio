// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { WebSocket, type RawData } from 'ws'
import {
  STREAMING_METHOD_KINDS,
  isJsonValue,
  type InvokeStreamClientMessage,
  type InvokeStreamResponse,
  type InvokeStreamStartPayload,
  type JsonValue,
  type StreamingMethodKind,
} from '@grpc-studio/shared'
import { getUserHeadersFromStreamPayload } from '../middlewares/userContextMiddleware.js'
import { wsMessagesTotal, wsMessageSizeBytes } from '../metrics/metrics.js'
import logger from '../utils/logger.js'

const STREAMING_METHOD_KIND_SET = new Set<StreamingMethodKind>(STREAMING_METHOD_KINDS)
const protocolLogger = logger.child({ module: 'websocket-protocol' })
const MAX_RESPONSE_PAYLOAD_BYTES = 10 * 1024 * 1024 // 10MB

export type ParseClientMessageResult =
  | { ok: true; message: InvokeStreamClientMessage }
  | { ok: false; error: string; tooLarge?: boolean }

export function parseClientMessage(data: RawData, maxBytes: number): ParseClientMessageResult {
  const text = rawDataToString(data)
  const byteLength = Buffer.byteLength(text, 'utf8')

  if (byteLength > maxBytes) {
    return { ok: false, error: 'Message too large', tooLarge: true }
  }

  wsMessagesTotal.inc({ direction: 'received' })
  wsMessageSizeBytes.observe({ direction: 'received' }, byteLength)

  let frame: unknown
  try {
    frame = JSON.parse(text)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  if (!isObject(frame) || typeof frame.type !== 'string') {
    return { ok: false, error: 'Missing or invalid message type' }
  }

  return parseFrame(frame)
}

export function sendResponse(ws: WebSocket, data: JsonValue): boolean {
  return sendFrame(ws, { type: 'response', data, sentAtMs: Date.now() })
}

export function sendPong(ws: WebSocket): boolean {
  return sendFrame(ws, { type: 'pong', sentAtMs: Date.now() })
}

export function sendError(ws: WebSocket, error: unknown): boolean {
  return sendFrame(ws, { type: 'error', error, sentAtMs: Date.now() })
}

export function sendComplete(ws: WebSocket): boolean {
  return sendFrame(ws, { type: 'complete', sentAtMs: Date.now() })
}

function parseFrame(frame: Record<string, unknown>): ParseClientMessageResult {
  switch (frame.type) {
    case 'ping':
      return { ok: true, message: { type: 'ping' } }

    case 'start': {
      const payload = parseStartPayload(frame.payload)
      if (!payload) {
        return { ok: false, error: 'Invalid payload: service, method, and streaming methodKind are required' }
      }
      return { ok: true, message: { type: 'start', payload } }
    }

    case 'data':
      if (frame.payload === undefined) {
        return { ok: false, error: 'data message requires a payload' }
      }
      if (!isJsonValue(frame.payload)) {
        return { ok: false, error: 'data message payload must be JSON' }
      }
      return { ok: true, message: { type: 'data', payload: frame.payload } }

    case 'end':
      return { ok: true, message: { type: 'end' } }

    case 'cancel':
      return { ok: true, message: { type: 'cancel' } }

    default:
      return { ok: false, error: `Unknown message type: ${frame.type}` }
  }
}

function parseStartPayload(payload: unknown): InvokeStreamStartPayload | null {
  if (!isObject(payload)) return null

  const { target, service, method, methodKind } = payload
  if (typeof target !== 'string' || typeof service !== 'string' || typeof method !== 'string' || !isStreamingMethodKind(methodKind)) {
    return null
  }

  const startPayload: InvokeStreamStartPayload = {
    target,
    service,
    method,
    methodKind,
  }

  if ('data' in payload) {
    if (!isJsonValue(payload.data)) return null
    startPayload.data = payload.data
  }

  if ('userHeaders' in payload) {
    const userHeaders = getUserHeadersFromStreamPayload(payload)
    if (!userHeaders) return null
    startPayload.userHeaders = userHeaders
  }

  return startPayload
}

function isStreamingMethodKind(value: unknown): value is StreamingMethodKind {
  return typeof value === 'string' && STREAMING_METHOD_KIND_SET.has(value as StreamingMethodKind)
}

function sendFrame(ws: WebSocket, frame: InvokeStreamResponse): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    protocolLogger.warn('Cannot send frame - socket not open', { readyState: ws.readyState })
    return false
  }

  try {
    const payload = JSON.stringify(frame)
    const byteLength = Buffer.byteLength(payload, 'utf8')

    if (byteLength > MAX_RESPONSE_PAYLOAD_BYTES) {
      protocolLogger.error('Response exceeds maximum payload size', {
        byteLength,
        maxBytes: MAX_RESPONSE_PAYLOAD_BYTES,
        frameType: frame.type,
      })
      return false
    }

    ws.send(payload)
    wsMessagesTotal.inc({ direction: 'sent' })
    wsMessageSizeBytes.observe({ direction: 'sent' }, byteLength)
    return true
  } catch (error) {
    protocolLogger.error('Failed to send frame', {
      type: frame.type,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8')
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data)).toString('utf8')
  }

  return data.toString('utf8')
}
