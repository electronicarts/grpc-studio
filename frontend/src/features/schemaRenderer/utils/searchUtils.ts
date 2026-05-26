// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Search / filter matching helpers for proto message fields and values.
 */
import type { DescField } from '@bufbuild/protobuf'
import { fieldTypeName } from '../../../utils/descUtils'
import { getNestedValue } from './fieldLookup'

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

/**
 * Check if a field matches the search query (name, type, or current value).
 */
export const fieldMatchesSearch = (
  field: DescField,
  formData: Record<string, unknown>,
  basePath: string,
  searchQuery: string
): boolean => {
  if (!searchQuery) return true

  const lowerQuery = searchQuery.toLowerCase()

  if (field.name.toLowerCase().includes(lowerQuery)) return true
  if (fieldTypeName(field).toLowerCase().includes(lowerQuery)) return true

  const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
  const value = getNestedValue(formData, fieldPath)
  if (valueMatchesSearch(value, searchQuery)) return true

  return false
}
