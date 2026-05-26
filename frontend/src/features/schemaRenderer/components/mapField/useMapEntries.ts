// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { valueMatchesSearch } from '../../utils/searchUtils'

interface UseMapEntriesParams {
  mapValue: Record<string, unknown>
  searchQuery: string
}

function mapEntryMatchesSearch(key: string, value: unknown, query: string): boolean {
  if (!query) return true

  const lowerQuery = query.toLowerCase()
  if (key.toLowerCase().includes(lowerQuery)) return true

  return valueMatchesSearch(value, query)
}

export function useMapEntries({ mapValue, searchQuery }: UseMapEntriesParams) {
  const allEntries = Object.entries(mapValue)
  const entries = searchQuery
    ? allEntries.filter(([key, value]) => mapEntryMatchesSearch(key, value, searchQuery))
    : allEntries

  const countDisplay = searchQuery && entries.length !== allEntries.length
    ? `${entries.length}/${allEntries.length}`
    : `${entries.length}`

  return { allEntries, entries, countDisplay }
}
