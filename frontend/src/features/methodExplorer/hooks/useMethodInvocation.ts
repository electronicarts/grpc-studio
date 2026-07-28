// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback, useRef, useState } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { ApiClientError } from '../../../lib/http/apiClient'
import { formLogger } from '../../../utils/debugLogger'
import { invokeUnary } from '../api'
import { toWireFormat, type Payload } from '../utils/payload'
import { useGrpcWebSocket } from './useGrpcWebSocket'
import { useStreamInvocationCallbacks } from './useStreamInvocationCallbacks'
import { useUnaryInvocationRecorder } from './useUnaryInvocationRecorder'
import { MethodKind } from '@grpc-studio/shared'
import type { StreamingMethodKind } from '@grpc-studio/shared'
import type { RequestModel, ResponseModel, StreamModel, MetadataModel, ResponseStatus, MethodInvocation } from '../types'
import type { RequestMetadata } from '@grpc-studio/shared'

export function useMethodInvocation(
  selectedTarget: string,
  selectedService: GrpcService | null,
  selectedMethod: GrpcMethod | null,
  request: RequestModel,
  response: ResponseModel,
  stream: StreamModel,
  metadata: MetadataModel,
  saveToHistory: (obj: Record<string, unknown>, status?: ResponseStatus, metadata?: RequestMetadata) => void
): MethodInvocation {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The metadata sent with the in-flight call. Recorders/callbacks fire after
  // the request completes, so we snapshot it at send time and attach it to the
  // history entry (which may be saved on success, error, or cancellation).
  const inFlightMetadataRef = useRef<RequestMetadata>({})

  const saveToHistoryWithMetadata = useCallback(
    (obj: Record<string, unknown>, status?: ResponseStatus) => {
      saveToHistory(obj, status, inFlightMetadataRef.current)
    },
    [saveToHistory],
  )

  function prepareRequest(): Payload {
    const input = request.isFormMode ? request.formData : JSON.parse(request.body)
    return toWireFormat(input, selectedMethod?.inputType ?? null, selectedTarget)
  }

  const { recordUnarySuccess, recordUnaryError } = useUnaryInvocationRecorder({
    selectedTarget,
    selectedMethod,
    response,
    stream,
    saveToHistory: saveToHistoryWithMetadata,
  })

  const streamCallbacks = useStreamInvocationCallbacks({
    selectedTarget,
    selectedService,
    selectedMethod,
    response,
    stream,
    saveToHistory: saveToHistoryWithMetadata,
    setLoading,
    setError,
  })

  const grpcWs = useGrpcWebSocket({
    onResponse: streamCallbacks.handleStreamResponse,
    onError: streamCallbacks.handleStreamError,
    onComplete: streamCallbacks.handleStreamComplete,
  })

  function resetResponseState(): void {
    stream.begin()
    response.clear()
  }

  function startStreaming(prepared: Payload, methodKind: StreamingMethodKind, requestMetadata: RequestMetadata): void {
    if (!selectedService || !selectedMethod) return

    formLogger.debug('Using WebSocket for streaming call')
    stream.start(prepared.display)

    grpcWs.start({
      target: selectedTarget,
      service: selectedService.fullName,
      method: selectedMethod.name,
      methodKind,
      data: prepared.wire,
      ...(Object.keys(requestMetadata).length > 0 ? { metadata: requestMetadata } : {}),
    })
  }

  async function invoke(): Promise<void> {
    if (!selectedMethod || !selectedService) return

    if (selectedMethod.kind !== MethodKind.UNARY && (stream.active || grpcWs.isStreaming)) {
      grpcWs.cancel()
    }

    setLoading(true)
    setError(null)
    resetResponseState()

    const requestMetadata = metadata.toMetadata()
    inFlightMetadataRef.current = requestMetadata

    let prepared: Payload | null = null
    try {
      prepared = prepareRequest()

      if (isStreamingMethodKind(selectedMethod.kind)) {
        startStreaming(prepared, selectedMethod.kind, requestMetadata)
        return
      }

      formLogger.debug('Using HTTP for unary call')
      const result = await invokeUnary({
        target: selectedTarget,
        service: selectedService.fullName,
        method: selectedMethod.name,
        methodKind: selectedMethod.kind,
        data: prepared.wire,
        ...(Object.keys(requestMetadata).length > 0 ? { metadata: requestMetadata } : {}),
      })
      recordUnarySuccess(result, prepared)
      setLoading(false)
    } catch (err) {
      if (err instanceof ApiClientError && prepared) {
        recordUnaryError(err, prepared)
      }

      // Provide helpful error messages for common connection issues
      let errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'

      if (errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network') ||
          errorMessage.includes('CONNECTION_ERROR')) {
        errorMessage += '\n\nThis may indicate a stale connection. Try refreshing the schemas (click the refresh button in the header or server selector).'
      }

      setError(errorMessage)
      setLoading(false)
      stream.deactivate()
    }
  }

  function sendMessage(): void {
    try {
      const { wire, display } = prepareRequest()
      grpcWs.sendData(wire)
      stream.addSent(display)
      request.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse request')
    }
  }

  function endStream(): void {
    formLogger.debug('Ending client stream')
    grpcWs.endStream()
    stream.deactivate()
  }

  function cancelStream(): void {
    formLogger.debug('Cancelling stream')
    grpcWs.cancel()
    stream.deactivate()
    setLoading(false)

    // Save cancelled stream to history
    const streamedRequest = stream.currentRequest()
    if (selectedService && selectedMethod && streamedRequest) {
      saveToHistoryWithMetadata(
        streamedRequest,
        {
          ok: false,
          message: 'Cancelled by user',
          responseTimeMs: stream.durationMs(),
        }
      )
    }
  }

  return { loading, error, setError, invoke, sendMessage, endStream, cancelStream }
}

function isStreamingMethodKind(kind: GrpcMethod['kind']): kind is StreamingMethodKind {
  return kind !== MethodKind.UNARY
}
