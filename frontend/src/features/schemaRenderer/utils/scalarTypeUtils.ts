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

/**
 * Get a human-readable display name for a scalar type.
 */
export function getScalarTypeName(scalar: ScalarType): string {
  switch (scalar) {
    case ScalarType.DOUBLE: return 'double'
    case ScalarType.FLOAT: return 'float'
    case ScalarType.INT64: return 'int64'
    case ScalarType.UINT64: return 'uint64'
    case ScalarType.INT32: return 'int32'
    case ScalarType.FIXED64: return 'fixed64'
    case ScalarType.FIXED32: return 'fixed32'
    case ScalarType.BOOL: return 'bool'
    case ScalarType.STRING: return 'string'
    case ScalarType.BYTES: return 'bytes'
    case ScalarType.UINT32: return 'uint32'
    case ScalarType.SFIXED32: return 'sfixed32'
    case ScalarType.SFIXED64: return 'sfixed64'
    case ScalarType.SINT32: return 'sint32'
    case ScalarType.SINT64: return 'sint64'
    default: return 'unknown'
  }
}

/**
 * Get the type name for a field's element/value type.
 * Handles scalar, enum, and message types.
 */
export function getFieldTypeName(
  kind: 'scalar' | 'enum' | 'message',
  field: {
    scalar?: ScalarType
    enum?: { typeName: string }
    message?: { typeName: string }
  }
): string {
  if (kind === 'scalar' && field.scalar !== undefined) {
    return getScalarTypeName(field.scalar)
  }
  if (kind === 'enum' && field.enum) {
    return field.enum.typeName
  }
  if (kind === 'message' && field.message) {
    return field.message.typeName
  }
  return 'unknown'
}
