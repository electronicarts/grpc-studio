// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// Manages request history in localStorage
import type { ResponseStatus, RequestHistoryItem } from '../types'
import { safeGetJSON, safeSetJSON } from '../../../utils/storageHelpers'

const MAX_HISTORY_ITEMS = 20

function getStorageKey(serviceName: string, methodName: string): string {
  return `grpc_history_${serviceName}_${methodName}`
}

export function getHistory(serviceName: string, methodName: string): RequestHistoryItem[] {
  return safeGetJSON<RequestHistoryItem[]>(getStorageKey(serviceName, methodName)) ?? []
}

export function saveRequest(
  serviceName: string,
  methodName: string,
  requestBody: Record<string, unknown>,
  formData: Record<string, unknown>,
  label?: string,
  responseStatus?: ResponseStatus,
): void {
  const key = getStorageKey(serviceName, methodName)
  const history = getHistory(serviceName, methodName)

  const newItem: RequestHistoryItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    requestBody,
    formData,
    label,
    responseStatus,
  }

  const trimmedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
  safeSetJSON(key, trimmedHistory)
}

export function deleteHistoryItem(serviceName: string, methodName: string, itemId: string): void {
  const key = getStorageKey(serviceName, methodName)
  const updatedHistory = getHistory(serviceName, methodName).filter(item => item.id !== itemId)
  safeSetJSON(key, updatedHistory)
}

export function clearHistory(serviceName: string, methodName: string): void {
  const key = getStorageKey(serviceName, methodName)
  try {
    localStorage.removeItem(key)
  } catch { /* best-effort */ }
}
