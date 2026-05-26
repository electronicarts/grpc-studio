// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import {
  useRequestModel,
  useResponseModel,
  useStreamModel,
  useHistoryModel,
  useMethodInvocation,
} from '../hooks'
import { formLogger } from '../../../utils/debugLogger'
import { canonicalizeProtoJson } from '../utils/payload'
import type {
  RequestModel,
  ResponseModel,
  StreamModel,
  HistoryModel,
  MethodInvocation,
  RequestHistoryItem,
} from '../types'

// ---------------------------------------------------------------------------
// Context shape — each field is a cohesive domain model
// ---------------------------------------------------------------------------

interface MethodExplorerContextValue {
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  request: RequestModel
  response: ResponseModel
  stream: StreamModel
  history: HistoryModel
  execution: MethodInvocation
  toggleHistory(): void
  loadFromHistory(item: RequestHistoryItem): void
}

const MethodExplorerContext = createContext<MethodExplorerContextValue | null>(null)

export function useMethodExplorerContext(): MethodExplorerContextValue {
  const ctx = useContext(MethodExplorerContext)
  if (!ctx) throw new Error('useMethodExplorerContext must be used within MethodExplorerProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Provider — composes domain models via hooks
// ---------------------------------------------------------------------------

interface MethodExplorerProviderProps {
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  initialRequestBody?: Record<string, unknown> | null
  children: ReactNode
}

export function MethodExplorerProvider({
  selectedService, selectedMethod, initialRequestBody, children
}: MethodExplorerProviderProps) {
  const request = useRequestModel(selectedMethod, initialRequestBody)
  const response = useResponseModel()
  const stream = useStreamModel()
  const history = useHistoryModel(selectedService, selectedMethod)

  const execution = useMethodInvocation(
    selectedService, selectedMethod,
    request, response, stream, history.save
  )

  const prevServiceRef = useRef(selectedService.fullName)
  const prevMethodRef = useRef(selectedMethod.name)

  useEffect(() => {
    if (prevServiceRef.current === selectedService.fullName && prevMethodRef.current === selectedMethod.name) return

    prevServiceRef.current = selectedService.fullName
    prevMethodRef.current = selectedMethod.name
    request.clear()
    response.clear()
    stream.reset()
    execution.setError(null)
    history.setVisible(false)
  }, [execution, history, request, response, selectedMethod.name, selectedService.fullName, stream])

  const toggleHistory = () => {
    history.setVisible(!history.visible)
  }

  const loadFromHistory = (item: RequestHistoryItem) => {
    try {
      const { data } = history.parse(item)
      const canonical = canonicalizeProtoJson(data, request.schema)

      request.setFormData(canonical)
      request.setBody(JSON.stringify(canonical, null, 2))
      response.clear()
      history.setVisible(false)
      execution.setError(null)
    } catch (error) {
      request.setBody(
        typeof item.requestBody === 'string'
          ? item.requestBody
          : JSON.stringify(item.requestBody ?? {}, null, 2),
      )
      execution.setError(error instanceof Error ? error.message : 'Failed to load history entry')
      formLogger.error('Failed to parse history JSON:', error)
    }
  }

  const value: MethodExplorerContextValue = {
    selectedService, selectedMethod,
    request, response, stream, history, execution,
    toggleHistory, loadFromHistory,
  }

  return (
    <MethodExplorerContext.Provider value={value}>
      {children}
    </MethodExplorerContext.Provider>
  )
}
