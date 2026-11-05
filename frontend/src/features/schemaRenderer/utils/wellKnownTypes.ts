// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage } from '@bufbuild/protobuf'
import {
  AnySchema,
  DurationSchema,
  FieldMaskSchema,
  StructSchema,
  TimestampSchema,
  isWrapperDesc,
  type WktWrapperDesc,
} from '@bufbuild/protobuf/wkt'

/**
 * A well-known type that gets a specialized editor instead of the regular message form. Wrappers carry buf's
 * narrowed descriptor, so callers can read the wrapped scalar without checking again.
 */
export type WellKnownType =
  { kind: 'timestamp' | 'duration' | 'fieldMask' | 'any' | 'struct' } | { kind: 'wrapper'; desc: WktWrapperDesc }

/**
 * Classifies a message type by the editor it gets, or returns null for a regular message.
 * buf recognizes the types; which editor each one gets is this app's choice, decided only here.
 */
export function wellKnownType(desc: DescMessage): WellKnownType | null {
  switch (desc.typeName) {
    case TimestampSchema.typeName:
      return { kind: 'timestamp' }
    case DurationSchema.typeName:
      return { kind: 'duration' }
    case FieldMaskSchema.typeName:
      return { kind: 'fieldMask' }
    case AnySchema.typeName:
      return { kind: 'any' }
    case StructSchema.typeName:
      return { kind: 'struct' }
    default:
      return isWrapperDesc(desc) ? { kind: 'wrapper', desc } : null
  }
}

/**
 * Whether a message type renders as a framed section with nested content (regular messages and Struct),
 * as opposed to a single input like Timestamp, Duration, FieldMask, Any and the wrappers.
 */
export function isFramedMessageType(desc: DescMessage): boolean {
  const kind = wellKnownType(desc)?.kind
  return kind === undefined || kind === 'struct'
}
