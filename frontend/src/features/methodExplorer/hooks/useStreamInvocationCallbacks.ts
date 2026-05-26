// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useRef } from 'react'
import type { GrpcMethod, GrpcService } from '@/types/grpc'
import { formLogger } from '@/utils/debugLogger'
import { parseGrpcErrorString } from '../utils/grpcErrorParser'
import { applyResponseSchema, normalizeResponseMessage } from '../utils/responseHandlerUtils'
import { applyResponseSnapshot, errorStatus, okStatus, stringifyPretty } from '../utils/responseStatus'
import type { ResponseModel, ResponseStatus, StreamModel } from '../types'

interface UseStreamInvocationCallbacksOptions {
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  response: ResponseModel
  stream: StreamModel
  saveToHistory: (obj: Record<string, unknown>, status?: ResponseStatus) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function useStreamInvocationCallbacks({
  selectedService,
  selectedMethod,
  response,
  stream,
  saveToHistory,
  setLoading,
  setError,
}: UseStreamInvocationCallbacksOptions) {
  const streamSchemaFetchedRef = useRef(false)

  useEffect(() => {
    streamSchemaFetchedRef.current = false
  }, [selectedMethod?.outputType])

  function requestDuration(): number | undefined {
    return stream.durationMs()
  }

  function handleStreamResponse(data: unknown): void {
    formLogger.debug('WebSocket message received:', data)

    const normalized = normalizeResponseMessage(data, selectedMethod?.outputType ?? null)
    const messages = stream.appendReceived(normalized.display)

    response.setData(messages)
    response.setRaw(stringifyPretty(messages))

    if (!streamSchemaFetchedRef.current) {
      streamSchemaFetchedRef.current = true
      applyResponseSchema(selectedMethod, response)
    }
  }

  function handleStreamError(wsError: string): void {
    formLogger.error('WebSocket error:', wsError)

    const parsed = parseGrpcErrorString(wsError)
    const errorMessage = parsed?.message ?? wsError

    stream.deactivate()
    setLoading(false)
    setError(errorMessage)

    const streamedRequest = stream.currentRequest()
    if (selectedService && selectedMethod && streamedRequest) {
      saveToHistory(
        streamedRequest,
        errorStatus(parsed?.code, errorMessage, requestDuration()),
      )
    }
  }

  function handleStreamComplete(): void {
    formLogger.debug('WebSocket stream completed')

    const duration = requestDuration()

    const messages = stream.currentMessages()
    const responseSizeBytes = applyResponseSnapshot(response, messages, stringifyPretty(messages), duration)
    applyResponseSchema(selectedMethod, response)

    const streamedRequest = stream.currentRequest()
    if (selectedService && selectedMethod && messages.length > 0 && streamedRequest) {
      saveToHistory(
        streamedRequest,
        okStatus(duration, responseSizeBytes),
      )
    }

    stream.complete()
    setLoading(false)
  }

  return { handleStreamResponse, handleStreamError, handleStreamComplete }
}
