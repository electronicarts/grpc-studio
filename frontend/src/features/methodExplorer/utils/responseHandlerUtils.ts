// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { toDisplayFormat } from './payload'
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
): ReturnType<typeof toDisplayFormat> {
  return toDisplayFormat(data, outputType)
}

/**
 * Fetch the response schema for a method and apply it to the response model.
 * No-op if method is null.
 */
export function applyResponseSchema(
  method: GrpcMethod | null,
  response: ResponseModel,
): void {
  if (!method) return

  schemaCache.getSchema(method.outputType)
    .then(schema => {
      response.setSchema(schema)
    })
    .catch(error => {
      formLogger.warn('Failed to fetch response schema:', error)
    })
}
