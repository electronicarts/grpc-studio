// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Protobuf type constants shared across schema-related features.
 * Based on proto3 spec: https://protobuf.dev/programming-guides/proto3/
 */

/** Primitive scalar types in proto3 */
export const SCALAR_TYPES = new Set([
  'double', 'float',
  'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
  'fixed32', 'fixed64', 'sfixed32', 'sfixed64',
  'bool', 'string', 'bytes'
])

/** Numeric types that need number conversion */
export const NUMERIC_TYPES = new Set([
  'double', 'float',
  'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64',
  'fixed32', 'fixed64', 'sfixed32', 'sfixed64'
])

/** Protobuf wrapper types serialize as bare primitive JSON values. */
export const WRAPPER_TYPE_TO_SCALAR: Readonly<Record<string, string>> = {
  'google.protobuf.DoubleValue': 'double',
  'google.protobuf.FloatValue': 'float',
  'google.protobuf.Int64Value': 'int64',
  'google.protobuf.UInt64Value': 'uint64',
  'google.protobuf.Int32Value': 'int32',
  'google.protobuf.UInt32Value': 'uint32',
  'google.protobuf.BoolValue': 'bool',
  'google.protobuf.StringValue': 'string',
  'google.protobuf.BytesValue': 'bytes'
}

export const WRAPPER_TYPES = new Set(Object.keys(WRAPPER_TYPE_TO_SCALAR))
