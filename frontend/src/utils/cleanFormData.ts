// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Recursively removes undefined values from an object for protobuf JSON serialization.
 * Protobuf JSON format doesn't support undefined - fields should be omitted if not set.
 */
export function cleanFormData(data: unknown): unknown {
  if (data === undefined || data === null) {
    return undefined
  }

  if (Array.isArray(data)) {
    // For arrays, filter out undefined elements and recursively clean
    return data
      .filter(item => item !== undefined)
      .map(item => cleanFormData(item))
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values
      if (value === undefined) {
        continue
      }

      // Recursively clean nested objects
      const cleanedValue = cleanFormData(value)

      // Only add if the cleaned value is not undefined
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue
      }
    }

    // Special case: google.protobuf.Any with only @type and no data fields
    // should be treated as undefined (field not set) to avoid fromJson errors
    // when bufbuild tries to create a WKT message with missing required fields
    if (cleaned['@type'] && Object.keys(cleaned).length === 1) {
      return undefined
    }

    return cleaned
  }

  // Primitive values (string, number, boolean) are returned as-is
  return data
}
