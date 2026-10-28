// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescEnum, DescField, DescMessage } from '@bufbuild/protobuf'
import { jsonZeroValue, scalarToJson } from '@/features/schemaRenderer/utils/scalarTypeUtils'
import { wellKnownType } from '@/features/schemaRenderer/utils/wellKnownTypes'

/**
 * The value a field takes when it is ticked to be sent before anything is entered, in form-data representation:
 * its `[default = …]` from the .proto when it declares one (proto2, editions), otherwise its type's zero value.
 */
export function defaultFieldValue(field: DescField): unknown {
  switch (field.fieldKind) {
    case 'scalar': {
      const declared = field.getDefaultValue()
      return declared === undefined ? jsonZeroValue(field.scalar) : scalarToJson(declared)
    }
    case 'enum':
      return enumValueName(field.enum, field.getDefaultValue())
    case 'list':
      return []
    case 'map':
      return {}
    case 'message':
      return defaultMessageValue(field.message)
  }
}

/** The value a new list item or map value starts with: its element type's zero value. */
export function defaultElementValue(field: DescField & { fieldKind: 'list' | 'map' }): unknown {
  if (field.fieldKind === 'list') {
    switch (field.listKind) {
      case 'scalar':
        return jsonZeroValue(field.scalar)
      case 'enum':
        return enumValueName(field.enum, undefined)
      case 'message':
        return defaultMessageValue(field.message)
    }
  }
  switch (field.mapKind) {
    case 'scalar':
      return jsonZeroValue(field.scalar)
    case 'enum':
      return enumValueName(field.enum, undefined)
    case 'message':
      return defaultMessageValue(field.message)
  }
}

/** The name of the declared default enum value, or the first value (the enum's zero value in proto3). */
function enumValueName(desc: DescEnum, declared: number | undefined): string | undefined {
  return (declared === undefined ? undefined : desc.value[declared]?.name) ?? desc.values[0]?.name
}

function defaultMessageValue(desc: DescMessage): unknown {
  const wellKnown = wellKnownType(desc)
  switch (wellKnown?.kind) {
    case 'timestamp':
      return new Date().toISOString()
    case 'duration':
      return '0s'
    case 'fieldMask':
      return ''
    case 'wrapper':
      return jsonZeroValue(wellKnown.desc.fields[0].scalar)
    default:
      return {}
  }
}
