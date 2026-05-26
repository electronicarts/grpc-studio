// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { fieldNestedMessage } from '../../../utils/descUtils'
import { isRecord } from '../../../utils/jsonUtils'

export function isCompositeField(field: DescField): boolean {
  return field.fieldKind !== 'scalar' && field.fieldKind !== 'enum'
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
