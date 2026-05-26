// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * gRPC error parsing — extracts structured error codes and
 * messages from raw gRPC error responses.
 */

export interface ParsedGrpcError {
  message: string
  code?: string
}

/**
 * Parse a gRPC error string (e.g. "Code: NotFound  Message: entity not found")
 * into a structured object.
 */
export function parseGrpcErrorString(errorStr: string): ParsedGrpcError | null {
  const match = errorStr.match(/Code:\s*(\w+).*?Message:\s*(.+?)(?:\n|$)/s)
  if (!match) return null
  return { code: match[1], message: `gRPC ${match[1]}: ${match[2].trim()}` }
}
