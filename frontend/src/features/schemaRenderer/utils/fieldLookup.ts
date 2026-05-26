// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Get a proto field value by its canonical field name.
 */
export const getFieldValue = (obj: Record<string, unknown> | undefined | null, fieldName: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined
  return obj[fieldName]
}

/**
 * Set a proto field value using its canonical field name.
 */
export const setFieldValue = (obj: Record<string, unknown> | undefined | null, fieldName: string, value: unknown): Record<string, unknown> => {
  if (!obj || typeof obj !== 'object') return { [fieldName]: value }
  return { ...obj, [fieldName]: value }
}

/**
 * Get nested value from object using dot notation path.
 */
export const getNestedValue = (obj: Record<string, unknown> | undefined | null, path: string): unknown => {
  if (!path) return obj

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === undefined || current === null) return undefined

    // Handle array indices like field[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]]
      if (!Array.isArray(current)) return undefined
      current = current[parseInt(arrayMatch[2])]
    } else if (part.match(/^\[.+\]$/)) {
      // Handle map keys like [keyName]
      const key = part.slice(1, -1)
      current = (current as Record<string, unknown>)[key]
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  return current
}
