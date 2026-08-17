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

/**
 * One place a nested message lives under a field: a plain message field, an
 * item of a repeated field, or a map entry's value.
 */
export interface NestedMessageSlot {
  schema: DescMessage
  value: unknown
  path: string
  /**
   * True for per-element slots (list items `items[0]`, map entries `m[key]`),
   * false for the field itself. Element slots exist only where data does, so
   * callers that record paths know which ones the data introduced.
   */
  isElement: boolean
}

/**
 * Enumerate the nested-message slots under `field` — the single place that
 * knows how message / repeated-message / map-of-message fields differ.
 *
 * With data, repeated and map fields yield one element slot per item or key.
 * Without it they yield a single slot for the field itself, so schema-only
 * walks (an empty request form) still reach the nested type.
 */
export function nestedMessageSlots(
  field: DescField,
  fieldValue: unknown,
  fieldPath: string,
): NestedMessageSlot[] {
  const schema = fieldNestedMessage(field)
  if (!schema) return []

  if (field.fieldKind === 'list' && Array.isArray(fieldValue)) {
    return fieldValue.map((item, index) => ({
      schema,
      value: item,
      path: `${fieldPath}[${index}]`,
      isElement: true,
    }))
  }

  if (field.fieldKind === 'map' && isRecord(fieldValue)) {
    return Object.entries(fieldValue).map(([key, value]) => ({
      schema,
      value,
      path: `${fieldPath}[${key}]`,
      isElement: true,
    }))
  }

  const value = field.fieldKind === 'message' ? fieldValue : undefined
  return [{ schema, value, path: fieldPath, isElement: false }]
}

/**
 * Visit every nested message *value* under `field` — slots with no data are
 * skipped, so this walks the payload rather than the schema.
 */
export function forEachNestedMessageValue(
  field: DescField,
  fieldValue: unknown,
  fieldPath: string,
  visit: (schema: DescMessage, value: Record<string, unknown>, path: string) => void,
): void {
  for (const slot of nestedMessageSlots(field, fieldValue, fieldPath)) {
    if (isRecord(slot.value)) visit(slot.schema, slot.value, slot.path)
  }
}
