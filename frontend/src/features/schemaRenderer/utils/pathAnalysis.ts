// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { getFieldValue } from './fieldLookup'
import { forEachNestedMessageValue, isCompositeField } from './descriptorTraversal'

export function collectExpandablePaths(
  schema: DescMessage,
  formData: Record<string, unknown>
): Set<string> {
  const pathsFound = new Set<string>()

  const processField = (field: DescField, fieldValue: unknown, fieldPath: string) => {
    if (isCompositeField(field)) {
      pathsFound.add(fieldPath)
    }

    forEachNestedMessageValue(field, fieldValue, fieldPath, findPopulated)
  }

  const findPopulated = (
    messageSchema: DescMessage,
    value: Record<string, unknown>,
    basePath: string = ''
  ) => {
    if (!value || typeof value !== 'object') return

    for (const field of messageSchema.fields) {
      if (field.oneof !== undefined) continue
      const fieldValue = getFieldValue(value, field.name)
      const fieldPath = basePath ? `${basePath}.${field.name}` : field.name
      processField(field, fieldValue, fieldPath)
    }
  }

  findPopulated(schema, formData)
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
