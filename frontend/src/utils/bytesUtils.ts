// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Utilities for handling protobuf bytes fields.
 * Protobuf bytes are transmitted as base64-encoded strings in JSON.
 */

/**
 * Convert a value to base64 string for display in bytes field.
 *
 * Handles three cases:
 * 1. Already a string (base64) - return as-is
 * 2. Node.js Buffer JSON shape { type: "Buffer", data: [...] } - convert to base64
 * 3. Other - stringify
 */
export function bytesToBase64(value: unknown): string {
  // Already base64 string
  if (typeof value === 'string') {
    return value
  }

  // Node.js Buffer JSON representation
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'data' in value &&
    value.type === 'Buffer' &&
    Array.isArray(value.data)
  ) {
    const bytes = new Uint8Array(value.data)
    // Use spread to avoid loop - browser handles efficiently
    return btoa(String.fromCharCode(...bytes))
  }

  // Fallback: stringify
  return String(value ?? '')
}

/**
 * Parse base64 string back to bytes for protobuf serialization.
 * Returns the input string (protobuf expects base64 for bytes fields in JSON).
 */
export function base64ToBytes(base64: string): string {
  return base64
}
