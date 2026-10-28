// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescEnum, DescField, DescMessage } from '@bufbuild/protobuf'
import type { ScalarValue } from '@bufbuild/protobuf/reflect'
import { isWrapperDesc } from '@bufbuild/protobuf/wkt'
import { base64Encode } from '@bufbuild/protobuf/wire'
import { scalarZeroValue } from './scalarTypeUtils'
import { wellKnownKind } from './wellKnownTypes'

/**
 * The value a field takes when it is ticked to be sent before anything is entered, in form-data representation:
 * its `[default = …]` from the .proto when it declares one (proto2, editions), otherwise its type's zero value.
 */
export function defaultFieldValue(field: DescField): unknown {
  switch (field.fieldKind) {
    case 'scalar':
      return declaredScalarDefault(field.getDefaultValue()) ?? scalarZeroValue(field.scalar)
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

/** The value a new item of a repeated field starts with: its element type's zero value. */
export function defaultListItem(field: DescField & { fieldKind: 'list' }): unknown {
  switch (field.listKind) {
    case 'scalar':
      return scalarZeroValue(field.scalar)
    case 'enum':
      return enumValueName(field.enum, undefined)
    case 'message':
      return defaultMessageValue(field.message)
  }
}

/** A declared scalar default (a runtime value from buf) in proto JSON form. */
function declaredScalarDefault(value: ScalarValue | undefined): unknown {
  if (value === undefined) return undefined
  if (typeof value === 'bigint') return String(value)
  if (value instanceof Uint8Array) return base64Encode(value)
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value) // "NaN", "Infinity", "-Infinity"
  return value
}

/** The name of the declared default enum value, or the first value (the enum's zero value in proto3). */
function enumValueName(desc: DescEnum, declared: number | undefined): string | undefined {
  return (declared === undefined ? undefined : desc.value[declared]?.name) ?? desc.values[0]?.name
}

function defaultMessageValue(desc: DescMessage): unknown {
  switch (wellKnownKind(desc)) {
    case 'timestamp':
      return new Date().toISOString()
    case 'duration':
      return '0s'
    case 'fieldMask':
      return ''
    case 'wrapper':
      return isWrapperDesc(desc) ? scalarZeroValue(desc.fields[0].scalar) : undefined
    case 'any':
    case 'struct':
    case null:
      return {}
  }
}
