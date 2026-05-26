// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export function safeGetJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export interface StorageResult {
  success: boolean;
  error?: string;
}

export function safeSetJSON<T>(key: string, value: T): StorageResult {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { success: true }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      localStorage.removeItem(key)
      return {
        success: false,
        error: 'Storage quota exceeded. Consider clearing old history.'
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to storage'
    }
  }
}

// Backward compatibility: return boolean
export function safeSetJSONLegacy<T>(key: string, value: T): boolean {
  const result = safeSetJSON(key, value)
  return result.success
}
