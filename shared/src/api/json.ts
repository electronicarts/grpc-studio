// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { JsonValue } from '@bufbuild/protobuf'

// The JSON types protobuf JSON is built from; shared so API payloads use the same ones as buf's toJson/fromJson
export type { JsonObject, JsonValue } from '@bufbuild/protobuf'

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
