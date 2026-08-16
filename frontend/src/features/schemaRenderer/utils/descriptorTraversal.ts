// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { fieldNestedMessage } from '../../../utils/descUtils'
import { isRecord } from '../../../utils/jsonUtils'

export function isCompositeField(field: DescField): boolean {
  return field.fieldKind !== 'scalar' && field.fieldKind !== 'enum'
}

/**
 * Absolute backstop on schema-walk depth, in case the data itself is cyclic
 * (a JSON payload never is, but form state is built up in the browser).
 */
export const MAX_TRAVERSAL_DEPTH = 64

/**
 * Should a schema walker descend into `nested`?
 *
 * A message that contains itself — directly (`Pet.parent`), through a repeated
 * field (`Pet.offspring`), through a map value, or indirectly via another
 * message (`Pet.lineage` → `PetLineage.ancestor` → `Pet`) — makes the
 * descriptor graph infinite. Walking it blindly overflows the stack.
 *
 * Re-entering a message type is safe only when real data justifies it: the
 * payload is finite even though the schema is not, so the data bounds the walk.
 * With no data there is nothing left to discover on a repeat visit — the
 * field's own path has already been recorded, and its children would be the
 * same field names again — so the branch is cut.
 *
 * @param ancestorTypes type names of the messages currently being walked,
 *   outermost first, including the message that owns the field.
 */
export function canDescendInto(
  nested: DescMessage,
  hasData: boolean,
  ancestorTypes: readonly string[],
): boolean {
  if (ancestorTypes.length >= MAX_TRAVERSAL_DEPTH) return false
  return hasData || !ancestorTypes.includes(nested.typeName)
}

export function forEachNestedMessageValue(
  field: DescField,
  fieldValue: unknown,
  fieldPath: string,
  visit: (schema: DescMessage, value: Record<string, unknown>, path: string) => void,
): void {
  const nestedMessage = fieldNestedMessage(field)
  if (!nestedMessage) return

  if (field.fieldKind === 'map') {
    if (field.mapKind !== 'message' || !isRecord(fieldValue)) return
    Object.entries(fieldValue).forEach(([mapKey, mapValue]) => {
      if (isRecord(mapValue)) {
        visit(nestedMessage, mapValue, `${fieldPath}[${mapKey}]`)
      }
    })
    return
  }

  if (field.fieldKind === 'list') {
    if (field.listKind !== 'message' || !Array.isArray(fieldValue)) return
    fieldValue.forEach((item, index) => {
      if (isRecord(item)) {
        visit(nestedMessage, item, `${fieldPath}[${index}]`)
      }
    })
    return
  }

  if (field.fieldKind === 'message' && isRecord(fieldValue)) {
    visit(nestedMessage, fieldValue, fieldPath)
  }
}
