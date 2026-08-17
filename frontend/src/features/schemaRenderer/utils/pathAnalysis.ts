// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { canDescendInto, isCompositeField, nestedMessageSlots } from './descriptorTraversal'
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
    // Composite fields (message / repeated / map) are the expandable ones
    if (isCompositeField(field)) {
      pathsFound.add(fieldPath)
    }

    for (const slot of nestedMessageSlots(field, fieldData, fieldPath)) {
      // List items and map entries get their own expandable path
      if (slot.isElement) pathsFound.add(slot.path)
      if (canDescendInto(slot.schema, slot.value != null, ancestorTypes)) {
        collectFromMessage(slot.schema, slot.path, slot.value as Record<string, unknown>, ancestorTypes)
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

    // `fields` covers oneOf members too, so one pass sees the whole message
    for (const field of messageSchema.fields) {
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      const fieldData = messageData ? get(messageData, field.name) : undefined
      // A oneOf member is only expandable when it holds data — it is then the
      // selected option. The unselected members have no path to expand.
      if (field.oneof !== undefined && fieldData === undefined) continue
      processField(field, fieldPath, fieldData, ancestorTypes)
    }
  }

  collectFromMessage(schema, '', data)
  return pathsFound
}

export function hasDataAtPath(data: Record<string, unknown>, path: string): boolean {
  const value = get(data, path)
  return value !== undefined && value !== null
}
