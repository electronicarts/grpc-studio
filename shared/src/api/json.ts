// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  if (valueType === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue)
  }

  return false
}
