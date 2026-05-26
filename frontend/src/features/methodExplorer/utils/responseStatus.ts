// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ResponseModel, ResponseStatus } from '../types'

export function stringifyPretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function applyResponseSnapshot(
  response: ResponseModel,
  data: unknown,
  rawJson: string,
  duration?: number,
): number {
  if (duration !== undefined) response.setTime(duration)
  response.setData(data)
  response.setRaw(rawJson)
  const size = rawJson.length
  response.setSize(size)
  return size
}

export function okStatus(duration?: number, size?: number): ResponseStatus {
  return { ok: true, code: 'OK', responseTimeMs: duration, responseSizeBytes: size }
}

export function errorStatus(
  code: string | undefined,
  message: string,
  duration?: number,
  size?: number,
): ResponseStatus {
  return { ok: false, code, message, responseTimeMs: duration, responseSizeBytes: size }
}
