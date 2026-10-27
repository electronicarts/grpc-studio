// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { DescMessage } from '@bufbuild/protobuf'
import {
  AnySchema,
  DurationSchema,
  FieldMaskSchema,
  StructSchema,
  TimestampSchema,
  isWrapperDesc,
} from '@bufbuild/protobuf/wkt'

/** The well-known types that get a specialized editor instead of the regular message form. */
export type WellKnownKind = 'timestamp' | 'duration' | 'fieldMask' | 'any' | 'struct' | 'wrapper'

/**
 * Classifies a message type by the editor it gets, or returns null for a regular message.
 * buf recognizes the types; which editor each one gets is this app's choice, decided only here.
 */
export function wellKnownKind(desc: DescMessage): WellKnownKind | null {
  switch (desc.typeName) {
    case TimestampSchema.typeName:
      return 'timestamp'
    case DurationSchema.typeName:
      return 'duration'
    case FieldMaskSchema.typeName:
      return 'fieldMask'
    case AnySchema.typeName:
      return 'any'
    case StructSchema.typeName:
      return 'struct'
    default:
      return isWrapperDesc(desc) ? 'wrapper' : null
  }
}

/**
 * Whether a message type renders as a framed section with nested content (regular messages and Struct),
 * as opposed to a single input like Timestamp, Duration, FieldMask, Any and the wrappers.
 */
export function isFramedMessageType(desc: DescMessage): boolean {
  const kind = wellKnownKind(desc)
  return kind === null || kind === 'struct'
}
