// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Search / filter matching helpers for proto message fields and values.
 */

/**
 * Check if a value matches a search query recursively.
 */
export const valueMatchesSearch = (value: unknown, query: string): boolean => {
  if (value === null || value === undefined) return false

  const lowerQuery = query.toLowerCase()

  if (typeof value === 'string') {
    return value.toLowerCase().includes(lowerQuery)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(lowerQuery)
  }
  if (Array.isArray(value)) {
    return value.some(item => valueMatchesSearch(item, query))
  }
  if (typeof value === 'object') {
    return Object.entries(value).some(([k, v]) =>
      k.toLowerCase().includes(lowerQuery) || valueMatchesSearch(v, query)
    )
  }
  return false
}
