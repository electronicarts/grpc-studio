// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { isCompositeField } from './descriptorTraversal'
import get from 'lodash-es/get'

/**
 * Collect all expandable paths from schema AND data.
 * For repeated fields, generates paths for each array item (e.g., items[0], items[1]).
 */
export function collectExpandablePaths(
  schema: DescMessage,
  data?: Record<string, unknown>
): Set<string> {
  const pathsFound = new Set<string>()

  const processField = (field: DescField, fieldPath: string, fieldData?: unknown) => {
    // Add composite fields as expandable
    if (isCompositeField(field)) {
      pathsFound.add(fieldPath)
    }

    // For repeated fields with messages, generate paths for each array item
    if (field.fieldKind === 'list' && field.listKind === 'message') {
      const arrayData = fieldData as unknown[] | undefined
      if (Array.isArray(arrayData)) {
        arrayData.forEach((_, index) => {
          const itemPath = `${fieldPath}[${index}]`
          pathsFound.add(itemPath)
          // Recursively collect from nested fields in array items
          collectFromMessage(field.message, itemPath, arrayData[index] as Record<string, unknown>)
        })
      } else {
        // No data yet, just collect schema paths
        collectFromMessage(field.message, fieldPath)
      }
    }
    // For regular nested messages
    else if (field.fieldKind === 'message') {
      collectFromMessage(field.message, fieldPath, fieldData as Record<string, unknown>)
    }
    // For maps with message values
    else if (field.fieldKind === 'map' && field.mapKind === 'message') {
      const mapData = fieldData as Record<string, unknown> | undefined
      if (mapData && typeof mapData === 'object') {
        Object.keys(mapData).forEach(key => {
          const entryPath = `${fieldPath}[${key}]`
          pathsFound.add(entryPath)
          collectFromMessage(field.message, entryPath, mapData[key] as Record<string, unknown>)
        })
      } else {
        collectFromMessage(field.message, fieldPath)
      }
    }
  }

  const collectFromMessage = (
    messageSchema: DescMessage,
    basePath: string = '',
    messageData?: Record<string, unknown>
  ) => {
    // Guard against incomplete schema (e.g., placeholder message types)
    if (!messageSchema.fields) return

    for (const field of messageSchema.fields) {
      if (field.oneof !== undefined) continue
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      const fieldData = messageData ? get(messageData, field.name) : undefined
      processField(field, fieldPath, fieldData)
    }
  }

  collectFromMessage(schema, '', data)
  return pathsFound
}

export function hasDataAtPath(data: Record<string, unknown>, path: string): boolean {
  const value = get(data, path)
  return value !== undefined && value !== null
}
