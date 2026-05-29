// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import get from 'lodash-es/get'

/**
 * Get a proto field value by its canonical field name.
 */
export const getFieldValue = (obj: Record<string, unknown> | undefined | null, fieldName: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined
  return obj[fieldName]
}

/**
 * Set a proto field value using its canonical field name.
 * Deletes the key if value is undefined (proto3 semantics: fields are present or absent, never explicitly undefined).
 */
export const setFieldValue = (
  obj: Record<string, unknown> | undefined | null,
  fieldName: string,
  value: unknown
): Record<string, unknown> => {
  if (!obj || typeof obj !== 'object') {
    return value === undefined ? {} : { [fieldName]: value }
  }

  const result = { ...obj }

  if (value === undefined) {
    delete result[fieldName]
  } else {
    result[fieldName] = value
  }

  return result
}

/**
 * Get nested value from object using dot notation path.
 * Supports array indices (field[0]) and map keys ([key]).
 */
export const getNestedValue = (obj: Record<string, unknown> | undefined | null, path: string): unknown => {
  if (!path) return obj
  return get(obj, path)
}
