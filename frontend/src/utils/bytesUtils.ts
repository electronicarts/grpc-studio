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
 * Format a byte count as a human-readable size (B / KB / MB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
