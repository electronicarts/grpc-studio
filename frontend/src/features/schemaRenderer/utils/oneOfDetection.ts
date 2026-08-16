// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage, DescField } from '@bufbuild/protobuf'
import { getFieldValue } from './fieldOperations'
import { forEachNestedMessageValue, isCompositeField, MAX_TRAVERSAL_DEPTH } from './descriptorTraversal'

/**
 * Walk the data, recording which member of each oneOf group is set.
 *
 * Recursion follows values, not the schema, so a cyclic schema alone cannot
 * run away — the payload is finite. `depth` guards the remaining case: form
 * state built in the browser could hold a reference cycle.
 */
export const detectOneOfSelections = (
  messageSchema: DescMessage | null,
  value: Record<string, unknown> | undefined | null,
  pathPrefix: string = '',
  depth: number = 0,
): Map<string, string> => {
  const selections = new Map<string, string>()
  if (!messageSchema || !value) return selections
  if (depth >= MAX_TRAVERSAL_DEPTH) return selections

  const processNestedValue = (field: DescField, fieldValue: unknown, fieldPath: string) => {
    forEachNestedMessageValue(field, fieldValue, fieldPath, (schema, nestedValue, nestedPath) => {
      detectOneOfSelections(schema, nestedValue, nestedPath, depth + 1)
        .forEach((v, k) => selections.set(k, v))
    })
  }

  // Detect within oneof groups
  for (const oneof of messageSchema.oneofs) {
    const groupPath = pathPrefix ? `${pathPrefix}.${oneof.name}` : oneof.name
    for (const f of oneof.fields) {
      const fv = getFieldValue(value, f.name)
      if (fv !== undefined && fv !== null) {
        selections.set(groupPath, f.name)
        const field = f as unknown as DescField
        if (isCompositeField(field)) {
          const fieldPath = pathPrefix ? `${pathPrefix}.${f.name}` : f.name
          processNestedValue(field, fv, fieldPath)
        }
        break
      }
    }
  }

  // Detect in regular fields
  for (const field of messageSchema.fields) {
    if (field.oneof !== undefined) continue
    const fieldValue = getFieldValue(value, field.name)
    if (fieldValue === undefined || fieldValue === null) continue
    if (isCompositeField(field)) {
      const fieldPath = pathPrefix ? `${pathPrefix}.${field.name}` : field.name
      processNestedValue(field, fieldValue, fieldPath)
    }
  }

  return selections
}
