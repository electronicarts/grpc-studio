// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { isCompositeField } from './descriptorTraversal'

export function collectExpandablePaths(
  schema: DescMessage
): Set<string> {
  const pathsFound = new Set<string>()

  const processField = (field: DescField, fieldPath: string) => {
    // Add all composite fields (nested messages, repeated, maps) as expandable
    if (isCompositeField(field)) {
      pathsFound.add(fieldPath)
    }

    // Recursively collect expandable paths in nested messages
    if (field.fieldKind === 'message') {
      collectFromMessage(field.message, fieldPath)
    } else if (field.fieldKind === 'list' && field.listKind === 'message') {
      collectFromMessage(field.message, fieldPath)
    } else if (field.fieldKind === 'map' && field.mapKind === 'message') {
      collectFromMessage(field.message, fieldPath)
    }
  }

  const collectFromMessage = (
    messageSchema: DescMessage,
    basePath: string = ''
  ) => {
    for (const field of messageSchema.fields) {
      if (field.oneof !== undefined) continue
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      processField(field, fieldPath)
    }
  }

  collectFromMessage(schema)
  return pathsFound
}

export function hasDataAtPath(data: Record<string, unknown>, path: string): boolean {
  const parts = path.split(/[.[\]]+/).filter(Boolean)
  let current: unknown = data
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return false
    current = (current as Record<string, unknown>)[part]
  }
  return current !== undefined && current !== null
}
