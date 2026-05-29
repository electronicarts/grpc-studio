// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ScalarType } from '@bufbuild/protobuf'

/**
 * Check if a scalar type is numeric (needs number input).
 */
function isNumeric(scalar: ScalarType): boolean {
  return scalar !== ScalarType.STRING &&
         scalar !== ScalarType.BYTES &&
         scalar !== ScalarType.BOOL
}

/**
 * Check if a scalar type is floating point.
 */
function isFloat(scalar: ScalarType): boolean {
  return scalar === ScalarType.FLOAT || scalar === ScalarType.DOUBLE
}

/**
 * Get the HTML input type for a scalar field.
 */
export function getInputType(scalar: ScalarType): string {
  if (isNumeric(scalar)) return 'number'
  if (scalar === ScalarType.BOOL) return 'checkbox'
  return 'text'
}

/**
 * Parse an input string to the proper JS type for a scalar field.
 */
export function parseValue(value: string, scalar: ScalarType): unknown {
  if (!value && value !== '0') return undefined

  if (isNumeric(scalar)) {
    const num = isFloat(scalar) ? parseFloat(value) : parseInt(value, 10)
    return isNaN(num) ? undefined : num
  }

  if (scalar === ScalarType.BOOL) {
    return value === 'true'
  }

  return value
}

/**
 * Check if a value is effectively empty
 * (null, undefined, empty string, empty object, empty array).
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && Object.keys(value).length === 0) return true
  return false
}
