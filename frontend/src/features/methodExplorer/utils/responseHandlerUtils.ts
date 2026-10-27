// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage } from '@bufbuild/protobuf'
import { toDisplayFormat, toWireJson } from './payload'
import { isRecord } from '../../../utils/jsonUtils'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { formLogger } from '../../../utils/debugLogger'
import type { GrpcMethod } from '../../../types/grpc'
import type { ResponseModel } from '../types'

/**
 * Canonicalize a raw response message through Buf protobuf JSON rules.
 */
export function normalizeResponseMessage(
  data: unknown,
  outputType: string | null,
  target?: string,
): ReturnType<typeof toDisplayFormat> {
  return toDisplayFormat(data, outputType, target)
}

/**
 * The raw unary response JSON with its message swapped for the message's wire form.
 * The raw JSON wraps a successful response's message as `data`; errors aren't messages, so they return null.
 */
export function wireResponseJson(
  raw: string,
  data: unknown,
  schema: DescMessage | null,
  target?: string,
): string | null {
  const wire = toWireJson(data, schema, target)
  if (!wire) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) && parsed.success === true ? JSON.stringify({ ...parsed, data: wire }, null, 2) : null
  } catch {
    return null
  }
}

/**
 * Fetch the response schema for a method and apply it to the response model.
 * No-op if method is null.
 */
export function applyResponseSchema(
  target: string,
  method: GrpcMethod | null,
  response: ResponseModel,
): void {
  if (!method) return

  schemaCache.getSchema(target, method.outputType)
    .then(schema => {
      response.setSchema(schema)
    })
    .catch(error => {
      formLogger.warn('Failed to fetch response schema:', error)
    })
}
