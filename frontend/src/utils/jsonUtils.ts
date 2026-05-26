// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { isJsonValue } from '@grpc-studio/shared'
import type { JsonObject } from '@grpc-studio/shared'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && isJsonValue(value)
}

export function cloneJsonObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject
}
