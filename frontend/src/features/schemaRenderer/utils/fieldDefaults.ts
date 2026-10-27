// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescField, DescMessage } from '@bufbuild/protobuf'
import { isWrapperDesc } from '@bufbuild/protobuf/wkt'
import { scalarZeroValue } from './scalarTypeUtils'
import { wellKnownKind } from './wellKnownTypes'

/**
 * The value a field takes when it is ticked to be sent before anything is entered, in form-data representation.
 */
export function defaultFieldValue(field: DescField): unknown {
  switch (field.fieldKind) {
    case 'scalar':
      return scalarZeroValue(field.scalar)
    case 'enum':
      return field.enum.values[0]?.name
    case 'list':
      return []
    case 'map':
      return {}
    case 'message':
      return defaultMessageValue(field.message)
  }
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
