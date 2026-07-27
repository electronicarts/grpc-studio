// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { getHistory, saveRequest, deleteHistoryItem, clearHistory } from '../utils/requestHistory'
import { createLogger } from '../../../utils/debugLogger'
import type { RequestHistoryItem, ResponseStatus, HistoryModel } from '../types'

const historyLogger = createLogger('History')

export function useHistoryModel(
  target: string,
  service: GrpcService | null,
  method: GrpcMethod | null,
  initialVisible = false
): HistoryModel {
  const [items, setItems] = useState<RequestHistoryItem[]>([])
  const [visible, setVisible] = useState(initialVisible)

  useEffect(() => {
    if (service && method) {
      setItems(getHistory(target, service.name ?? service.fullName, method.name))
    }
  }, [target, service, method])

  const save = useCallback((requestObj: Record<string, unknown>, status?: ResponseStatus) => {
    historyLogger.debug('save() called', { target, service: service?.name, method: method?.name })
    if (!service || !method) {
      historyLogger.warn('save() aborted - no service or method')
      return
    }
    saveRequest(target, service.name ?? service.fullName, method.name, requestObj, requestObj, undefined, status)
    setItems(getHistory(target, service.name ?? service.fullName, method.name))
  }, [target, service, method])

  const parse = useCallback((item: RequestHistoryItem): { json: string; data: Record<string, unknown> } => {
    const json = typeof item.requestBody === 'string'
      ? item.requestBody
      : JSON.stringify(item.requestBody, null, 2)
    const data = typeof item.requestBody === 'string'
      ? JSON.parse(item.requestBody)
      : item.requestBody
    return { json, data: item.formData || data || {} }
  }, [])

  const remove = useCallback((itemId: string) => {
    if (!service || !method) return
    deleteHistoryItem(target, service.name ?? service.fullName, method.name, itemId)
    setItems(getHistory(target, service.name ?? service.fullName, method.name))
  }, [target, service, method])

  const clearAll = useCallback(() => {
    if (!service || !method) return
    if (confirm('Clear all request history for this method?')) {
      clearHistory(target, service.name ?? service.fullName, method.name)
      setItems([])
    }
  }, [target, service, method])

  return { items, visible, setVisible, save, parse, remove, clearAll }
}
