// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState } from 'react'
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
import type { RequestModel, ResponseModel, StreamModel, ResponseStatus, MethodInvocation } from '../types'

export function useMethodInvocation(
  selectedService: GrpcService | null,
  selectedMethod: GrpcMethod | null,
  request: RequestModel,
  response: ResponseModel,
  stream: StreamModel,
  saveToHistory: (obj: Record<string, unknown>, status?: ResponseStatus) => void
): MethodInvocation {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function prepareRequest(): Payload {
    const input = request.isFormMode ? request.formData : JSON.parse(request.body)
    return toWireFormat(input, selectedMethod?.inputType ?? null)
  }

  const { recordUnarySuccess, recordUnaryError } = useUnaryInvocationRecorder({
    selectedMethod,
    response,
    stream,
    saveToHistory,
  })

  const streamCallbacks = useStreamInvocationCallbacks({
    selectedService,
    selectedMethod,
    response,
    stream,
    saveToHistory,
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

  function startStreaming(prepared: Payload, methodKind: StreamingMethodKind): void {
    if (!selectedService || !selectedMethod) return

    formLogger.debug('Using WebSocket for streaming call')
    stream.start(prepared.display)

    grpcWs.start({
      service: selectedService.fullName,
      method: selectedMethod.name,
      methodKind,
      data: prepared.wire,
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

    let prepared: Payload | null = null
    try {
      prepared = prepareRequest()

      if (isStreamingMethodKind(selectedMethod.kind)) {
        startStreaming(prepared, selectedMethod.kind)
        return
      }

      formLogger.debug('Using HTTP for unary call')
      const result = await invokeUnary({
        service: selectedService.fullName,
        method: selectedMethod.name,
        methodKind: selectedMethod.kind,
        data: prepared.wire,
      })
      recordUnarySuccess(result, prepared)
      setLoading(false)
    } catch (err) {
      if (err instanceof ApiClientError && prepared) {
        recordUnaryError(err, prepared)
      }

      setError(err instanceof Error ? err.message : 'Unknown error occurred')
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
  }

  return { loading, error, setError, invoke, sendMessage, endStream, cancelStream }
}

function isStreamingMethodKind(kind: GrpcMethod['kind']): kind is StreamingMethodKind {
  return kind !== MethodKind.UNARY
}
