// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { canDescendInto, isCompositeField } from './descriptorTraversal'
import get from 'lodash-es/get'

/**
 * Collect all expandable paths from schema AND data.
 * For repeated fields, generates paths for each array item (e.g., items[0], items[1]).
 *
 * The schema graph may be cyclic (a message containing itself), so descent is
 * gated by `canDescendInto` — see that function for the rule.
 */
export function collectExpandablePaths(
  schema: DescMessage,
  data?: Record<string, unknown>
): Set<string> {
  const pathsFound = new Set<string>()

  const processField = (
    field: DescField,
    fieldPath: string,
    fieldData: unknown,
    ancestorTypes: readonly string[],
  ) => {
    // Add composite fields as expandable
    if (isCompositeField(field)) {
      pathsFound.add(fieldPath)
    }

    // For repeated fields with messages, generate paths for each array item
    if (field.fieldKind === 'list' && field.listKind === 'message') {
      const arrayData = fieldData as unknown[] | undefined
      if (Array.isArray(arrayData)) {
        arrayData.forEach((item, index) => {
          const itemPath = `${fieldPath}[${index}]`
          pathsFound.add(itemPath)
          // Recursively collect from nested fields in array items
          if (canDescendInto(field.message, item != null, ancestorTypes)) {
            collectFromMessage(field.message, itemPath, item as Record<string, unknown>, ancestorTypes)
          }
        })
      } else if (canDescendInto(field.message, false, ancestorTypes)) {
        // No data yet, just collect schema paths
        collectFromMessage(field.message, fieldPath, undefined, ancestorTypes)
      }
    }
    // For regular nested messages
    else if (field.fieldKind === 'message') {
      if (canDescendInto(field.message, fieldData != null, ancestorTypes)) {
        collectFromMessage(field.message, fieldPath, fieldData as Record<string, unknown>, ancestorTypes)
      }
    }
    // For maps with message values
    else if (field.fieldKind === 'map' && field.mapKind === 'message') {
      const mapData = fieldData as Record<string, unknown> | undefined
      if (mapData && typeof mapData === 'object') {
        Object.keys(mapData).forEach(key => {
          const entryPath = `${fieldPath}[${key}]`
          pathsFound.add(entryPath)
          if (canDescendInto(field.message, mapData[key] != null, ancestorTypes)) {
            collectFromMessage(field.message, entryPath, mapData[key] as Record<string, unknown>, ancestorTypes)
          }
        })
      } else if (canDescendInto(field.message, false, ancestorTypes)) {
        collectFromMessage(field.message, fieldPath, undefined, ancestorTypes)
      }
    }
  }

  const collectFromMessage = (
    messageSchema: DescMessage,
    basePath: string = '',
    messageData?: Record<string, unknown>,
    parentTypes: readonly string[] = [],
  ) => {
    // Guard against incomplete schema (e.g., placeholder message types)
    if (!messageSchema.fields) return

    const ancestorTypes = [...parentTypes, messageSchema.typeName]

    for (const field of messageSchema.fields) {
      // Skip oneOf fields - they'll be collected from the oneOf groups below
      if (field.oneof !== undefined) continue
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      const fieldData = messageData ? get(messageData, field.name) : undefined
      processField(field, fieldPath, fieldData, ancestorTypes)
    }

    // Collect paths from oneOf groups
    for (const oneof of messageSchema.oneofs) {
      for (const field of oneof.fields as unknown as DescField[]) {
        const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
        const fieldData = messageData ? get(messageData, field.name) : undefined
        // Only process if this field has data (i.e., it's the selected oneOf option)
        if (fieldData !== undefined) {
          processField(field, fieldPath, fieldData, ancestorTypes)
        }
      }
    }
  }

  collectFromMessage(schema, '', data)
  return pathsFound
}

export function hasDataAtPath(data: Record<string, unknown>, path: string): boolean {
  const value = get(data, path)
  return value !== undefined && value !== null
}
