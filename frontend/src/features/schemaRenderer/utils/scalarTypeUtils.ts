// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ScalarType, protoInt64 } from '@bufbuild/protobuf'
import { scalarZeroValue, type ScalarValue } from '@bufbuild/protobuf/reflect'
import { base64Encode } from '@bufbuild/protobuf/wire'

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
 * 64-bit integers are strings in proto JSON, since JS numbers can't hold them exactly.
 */
function is64Bit(scalar: ScalarType): boolean {
  return scalar === ScalarType.INT64 || scalar === ScalarType.SINT64 || scalar === ScalarType.SFIXED64
    || isUnsigned64Bit(scalar)
}

function isUnsigned64Bit(scalar: ScalarType): boolean {
  return scalar === ScalarType.UINT64 || scalar === ScalarType.FIXED64
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

  if (is64Bit(scalar)) {
    // Kept as a string, like proto JSON, so values beyond 2^53 survive; buf validates the range
    try {
      return String(isUnsigned64Bit(scalar) ? protoInt64.uParse(value) : protoInt64.parse(value))
    } catch {
      return undefined
    }
  }

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
 * A scalar runtime value from buf (bigint, Uint8Array, …) in proto JSON form, the form data's representation.
 */
export function scalarToJson(value: ScalarValue): unknown {
  if (typeof value === 'bigint') return String(value)
  if (value instanceof Uint8Array) return base64Encode(value)
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value) // "NaN", "Infinity", "-Infinity"
  return value
}

/** A scalar type's zero value (buf's `scalarZeroValue`) in proto JSON form: `0`, `"0"` for 64-bit, `false`, `""`. */
export function jsonZeroValue(scalar: ScalarType): unknown {
  return scalarToJson(scalarZeroValue(scalar, false))
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
