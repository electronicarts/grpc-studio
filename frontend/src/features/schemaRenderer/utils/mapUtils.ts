// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Utilities for working with protobuf map fields.
 */

import { valueMatchesSearch } from './searchUtils'

interface FilterMapEntriesParams {
  mapValue: Record<string, unknown>
  searchQuery: string
}

interface FilterMapEntriesResult {
  allEntries: [string, unknown][]
  entries: [string, unknown][]
  countDisplay: string
}

/**
 * Check if a map entry (key-value pair) matches the search query.
 */
function mapEntryMatchesSearch(key: string, value: unknown, query: string): boolean {
  if (!query) return true

  const lowerQuery = query.toLowerCase()
  if (key.toLowerCase().includes(lowerQuery)) return true

  return valueMatchesSearch(value, query)
}

/**
 * Filter map entries based on search query.
 * Returns all entries, filtered entries, and a display count string.
 */
export function filterMapEntries({ mapValue, searchQuery }: FilterMapEntriesParams): FilterMapEntriesResult {
  const allEntries = Object.entries(mapValue)
  const entries = searchQuery
    ? allEntries.filter(([key, value]) => mapEntryMatchesSearch(key, value, searchQuery))
    : allEntries

  const countDisplay = searchQuery && entries.length !== allEntries.length
    ? `${entries.length}/${allEntries.length}`
    : `${entries.length}`

  return { allEntries, entries, countDisplay }
}
