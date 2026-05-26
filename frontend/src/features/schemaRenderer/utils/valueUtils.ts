// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Value parsing, input type resolution, and empty-value checks
 * for protobuf scalar / wrapper fields.
 */
import { SCALAR_TYPES, NUMERIC_TYPES } from '../constants'

/**
 * Check if a type is a scalar primitive.
 */
export const isScalar = (type: string): boolean => SCALAR_TYPES.has(type)

/**
 * Get the HTML input type for a scalar field.
 */
export const getInputType = (type: string): string => {
  if (NUMERIC_TYPES.has(type)) return 'number'
  if (type === 'bool') return 'checkbox'
  return 'text'
}

/**
 * Convert an input string to the proper JS type for a proto field.
 */
export const parseValue = (value: string, type: string): unknown => {
  if (!value && value !== '0') return undefined
  if (NUMERIC_TYPES.has(type)) {
    const num = type.includes('float') || type === 'double'
      ? parseFloat(value)
      : parseInt(value, 10)
    return isNaN(num) ? undefined : num
  }
  if (type === 'bool') return value === 'true'
  return value
}

/**
 * Check if a value is effectively empty
 * (null, undefined, empty string, empty object, empty array).
 */
export const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && Object.keys(value).length === 0) return true
  return false
}
