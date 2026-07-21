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

// ---------------------------------------------------------------------------
// Raw string access — for values that are already plain strings (timestamps,
// flags) and shouldn't be JSON-encoded. Same safe/try-catch guarantees.
// ---------------------------------------------------------------------------

export function safeGetString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch { /* best-effort */ }
}

export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch { /* best-effort */ }
}
