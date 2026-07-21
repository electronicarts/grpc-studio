// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// Manages request history in localStorage
import type { ResponseStatus, RequestHistoryItem } from '../types'
import { safeGetJSON, safeSetJSON, safeRemove } from '../../../utils/storageHelpers'
import { createLogger } from '../../../utils/debugLogger'

const MAX_HISTORY_ITEMS = 20
const historyLogger = createLogger('History')

function getStorageKey(target: string, serviceName: string, methodName: string): string {
  const key = `grpc_history_${target}_${serviceName}_${methodName}`
  historyLogger.debug('Storage key:', key)
  return key
}

export function getHistory(target: string, serviceName: string, methodName: string): RequestHistoryItem[] {
  return safeGetJSON<RequestHistoryItem[]>(getStorageKey(target, serviceName, methodName)) ?? []
}

export function saveRequest(
  target: string,
  serviceName: string,
  methodName: string,
  requestBody: Record<string, unknown>,
  formData: Record<string, unknown>,
  label?: string,
  responseStatus?: ResponseStatus,
): void {
  historyLogger.debug('Saving request:', { target, serviceName, methodName })
  const key = getStorageKey(target, serviceName, methodName)
  const history = getHistory(target, serviceName, methodName)

  const newItem: RequestHistoryItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    requestBody,
    formData,
    label,
    responseStatus,
  }

  const trimmedHistory = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS)
  historyLogger.debug('Saving to localStorage, count:', trimmedHistory.length)
  safeSetJSON(key, trimmedHistory)
}

export function deleteHistoryItem(target: string, serviceName: string, methodName: string, itemId: string): void {
  const key = getStorageKey(target, serviceName, methodName)
  const updatedHistory = getHistory(target, serviceName, methodName).filter(item => item.id !== itemId)
  safeSetJSON(key, updatedHistory)
}

export function clearHistory(target: string, serviceName: string, methodName: string): void {
  safeRemove(getStorageKey(target, serviceName, methodName))
}
