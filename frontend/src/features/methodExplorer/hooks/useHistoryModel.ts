// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { getHistory, saveRequest, deleteHistoryItem, clearHistory } from '../utils/requestHistory'
import type { RequestHistoryItem, ResponseStatus, HistoryModel } from '../types'

export function useHistoryModel(
  service: GrpcService | null,
  method: GrpcMethod | null
): HistoryModel {
  const [items, setItems] = useState<RequestHistoryItem[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (service && method) {
      setItems(getHistory(service.name ?? service.fullName, method.name))
    }
  }, [service, method])

  const save = useCallback((requestObj: Record<string, unknown>, status?: ResponseStatus) => {
    if (!service || !method) return
    saveRequest(service.name ?? service.fullName, method.name, requestObj, requestObj, undefined, status)
    setItems(getHistory(service.name ?? service.fullName, method.name))
  }, [service, method])

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
    deleteHistoryItem(service.name ?? service.fullName, method.name, itemId)
    setItems(getHistory(service.name ?? service.fullName, method.name))
  }, [service, method])

  const clearAll = useCallback(() => {
    if (!service || !method) return
    if (confirm('Clear all request history for this method?')) {
      clearHistory(service.name ?? service.fullName, method.name)
      setItems([])
    }
  }, [service, method])

  return { items, visible, setVisible, save, parse, remove, clearAll }
}
