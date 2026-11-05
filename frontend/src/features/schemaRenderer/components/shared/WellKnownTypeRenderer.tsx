// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared logic for rendering well-known types with specialized components.
 * Used by both MessageField (for WKT fields) and AnyContentRenderer (for WKT content in Any).
 */

import React from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { wellKnownType } from '@/features/schemaRenderer/utils/wellKnownTypes'
import TimestampField from '@/features/schemaRenderer/components/wellKnown/TimestampField'
import DurationField from '@/features/schemaRenderer/components/wellKnown/DurationField'
import FieldMaskField from '@/features/schemaRenderer/components/wellKnown/FieldMaskField'
import WrapperField from '@/features/schemaRenderer/components/wellKnown/WrapperField'
import AnyField from '@/features/schemaRenderer/components/wellKnown/AnyField'
import StructField from '@/features/schemaRenderer/components/struct/StructField'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'

interface WellKnownTypeRendererProps {
  message: DescMessage
  fieldName: string
  value: unknown
  onChange: (value: unknown) => void
  path: string
  /** Passed to object-like types (Struct), which show it in their frame like regular messages. */
  presence?: FieldPresence
}

/**
 * Routes a message type to its specialized WKT component.
 * Returns the component if it's a WKT, or null if it should be rendered as a regular message.
 */
export function renderWellKnownType(props: WellKnownTypeRendererProps): React.ReactElement | null {
  const { message, fieldName, value, onChange, path, presence } = props

  const wellKnown = wellKnownType(message)
  switch (wellKnown?.kind) {
    case 'timestamp':
      return <TimestampField name={fieldName} value={value} onChange={onChange} />
    case 'duration':
      return <DurationField name={fieldName} value={value} onChange={onChange} />
    case 'fieldMask':
      return <FieldMaskField name={fieldName} value={value} onChange={onChange} />
    case 'any':
      return <AnyField name={fieldName} value={value} onChange={onChange} />
    case 'struct':
      return (
        <StructField
          name={fieldName}
          typeName={message.typeName}
          value={value}
          onChange={onChange as (value: Record<string, unknown>) => void}
          path={path}
          presence={presence}
        />
      )
    case 'wrapper':
      return <WrapperField name={fieldName} desc={wellKnown.desc} value={value} onChange={onChange} />
    default:
      return null
  }
}
