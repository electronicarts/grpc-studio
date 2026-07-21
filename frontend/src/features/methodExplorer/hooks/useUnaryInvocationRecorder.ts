// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod } from '@/types/grpc'
import { ApiClientError } from '@/lib/http/apiClient'
import { applyResponseSchema, normalizeResponseMessage } from '../utils/responseHandlerUtils'
import type { Payload } from '../utils/payload'
import { applyResponseSnapshot, errorStatus, okStatus, stringifyPretty } from '../utils/responseStatus'
import type { ResponseModel, ResponseStatus, StreamModel } from '../types'
import type { InvokeUnaryResponse } from '@grpc-studio/shared'

interface UseUnaryInvocationRecorderOptions {
  selectedTarget: string
  selectedMethod: GrpcMethod | null
  response: ResponseModel
  stream: StreamModel
  saveToHistory: (obj: Record<string, unknown>, status?: ResponseStatus) => void
}

export function useUnaryInvocationRecorder({
  selectedTarget,
  selectedMethod,
  response,
  stream,
  saveToHistory,
}: UseUnaryInvocationRecorderOptions) {
  function requestDuration(): number | undefined {
    return stream.durationMs()
  }

  function recordUnarySuccess(result: InvokeUnaryResponse, prepared: Payload): void {
    const duration = requestDuration()
    if (duration !== undefined) response.setTime(duration)

    const actualResponseData = result.success ? result.data : result
    const normalized = normalizeResponseMessage(actualResponseData, selectedMethod?.outputType ?? null, selectedTarget)
    const rawPayload = result.success
      ? { ...result, data: normalized.display, responseTime: duration ? `${duration}ms` : undefined }
      : { ...normalized.display, responseTime: duration ? `${duration}ms` : undefined }
    const rawJson = stringifyPretty(rawPayload)

    const size = applyResponseSnapshot(response, normalized.display, rawJson, duration)
    applyResponseSchema(selectedTarget, selectedMethod, response)

    if (result.success) {
      saveToHistory(
        prepared.display,
        okStatus(duration, size),
      )
    }
  }

  function recordUnaryError(apiError: ApiClientError, prepared: Payload): void {
    saveToHistory(
      prepared.display,
      errorStatus(apiError.code ?? `HTTP ${apiError.status}`, apiError.message, requestDuration(), apiError.message.length),
    )
  }

  return { recordUnarySuccess, recordUnaryError }
}
