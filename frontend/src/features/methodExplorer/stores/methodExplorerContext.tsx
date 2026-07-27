// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { useRequestModel } from '../hooks/useRequestModel'
import { useResponseModel } from '../hooks/useResponseModel'
import { useStreamModel } from '../hooks/useStreamModel'
import { useHistoryModel } from '../hooks/useHistoryModel'
import { useMethodInvocation } from '../hooks/useMethodInvocation'
import { formLogger } from '../../../utils/debugLogger'
import { canonicalizeProtoJson } from '../utils/payload'
import { tabStateStore, type TabStateSnapshot } from '@/stores'
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
  selectedTarget: string
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
  tabId: string
  selectedTarget: string
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  initialRequestBody?: Record<string, unknown> | null
  children: ReactNode
}

export function MethodExplorerProvider({
  tabId, selectedTarget, selectedService, selectedMethod, initialRequestBody, children
}: MethodExplorerProviderProps) {
  // Rehydrate from the per-tab store when this tab was previously mounted, so
  // switching away (which unmounts idle tabs) and back preserves its state.
  const restoredRef = useRef<TabStateSnapshot | undefined>(tabStateStore.getSnapshot(tabId))
  const restored = restoredRef.current

  const request = useRequestModel(selectedTarget, selectedMethod, initialRequestBody, restored?.request)
  const response = useResponseModel(restored?.response)
  const stream = useStreamModel(restored?.stream)
  const history = useHistoryModel(selectedTarget, selectedService, selectedMethod, restored?.historyVisible)

  const execution = useMethodInvocation(
    selectedTarget, selectedService, selectedMethod,
    request, response, stream, history.save
  )

  // Persist a serializable snapshot to the store on every change so an unmount
  // never loses data. (Refs like the live socket are intentionally excluded.)
  useEffect(() => {
    tabStateStore.setSnapshot(tabId, {
      request: {
        body: request.body,
        formData: request.formData,
        formKey: request.formKey,
        isFormMode: request.isFormMode,
        schema: request.schema,
        validationError: request.validationError,
      },
      response: {
        raw: response.raw,
        data: response.data,
        time: response.time,
        size: response.size,
        schema: response.schema,
        isFormMode: response.isFormMode,
        singleExpanded: response.singleExpanded,
      },
      stream: {
        messages: stream.messages,
        sentMessages: stream.sentMessages,
        completed: stream.completed,
      },
      historyVisible: history.visible,
    })
  }, [
    tabId,
    request.body, request.formData, request.formKey, request.isFormMode, request.schema, request.validationError,
    response.raw, response.data, response.time, response.size, response.schema, response.isFormMode, response.singleExpanded,
    stream.messages, stream.sentMessages, stream.completed,
    history.visible,
  ])

  // Report live work (in-flight unary or active stream) so Playground keeps
  // this tab mounted even when it isn't the active tab.
  useEffect(() => {
    const isLive = execution.loading || stream.active
    tabStateStore.setLiveWork(tabId, isLive)
  }, [tabId, execution.loading, stream.active])

  // On unmount, this tab is no longer doing live work from the tree's view.
  useEffect(() => () => { tabStateStore.setLiveWork(tabId, false) }, [tabId])

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
    selectedTarget, selectedService, selectedMethod,
    request, response, stream, history, execution,
    toggleHistory, loadFromHistory,
  }

  return (
    <MethodExplorerContext.Provider value={value}>
      {children}
    </MethodExplorerContext.Provider>
  )
}
