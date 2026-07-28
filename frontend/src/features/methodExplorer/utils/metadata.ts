// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { RequestMetadata } from '@grpc-studio/shared'
import type { MetadataRow } from '../types'

/**
 * Convert editor rows into the wire metadata map: only enabled rows with a
 * non-empty key are included, keys are lowercased and trimmed, and later rows
 * win on duplicate keys (matching how the backend merges headers).
 */
export function rowsToMetadata(rows: MetadataRow[]): RequestMetadata {
  const metadata: RequestMetadata = {}
  for (const row of rows) {
    if (!row.enabled) continue
    const key = row.key.trim().toLowerCase()
    if (key === '') continue
    metadata[key] = row.value
  }
  return metadata
}

/** True when at least one row would be sent. */
export function activeRowCount(rows: MetadataRow[]): number {
  return Object.keys(rowsToMetadata(rows)).length
}

/**
 * Rebuild editor rows from a stored metadata map (e.g. loading history). Each
 * key/value becomes an enabled row. IDs are assigned by the caller-provided
 * generator so they stay unique within the editor.
 */
export function metadataToRows(
  metadata: RequestMetadata | undefined | null,
  nextId: () => string,
): MetadataRow[] {
  if (!metadata) return []
  return Object.entries(metadata).map(([key, value]) => ({
    id: nextId(),
    key,
    value,
    enabled: true,
  }))
}
