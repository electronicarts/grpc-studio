// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared logic for rendering well-known types with specialized components.
 * Used by both MessageField (for WKT fields) and AnyContentRenderer (for WKT content in Any).
 */

import React from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { isWrapperDesc } from '@bufbuild/protobuf/wkt'
import { wellKnownKind } from '../../utils/wellKnownTypes'
import TimestampField from '../wellKnown/TimestampField'
import DurationField from '../wellKnown/DurationField'
import FieldMaskField from '../wellKnown/FieldMaskField'
import WrapperField from '../wellKnown/WrapperField'
import AnyField from '../wellKnown/AnyField'
import StructField from '../struct/StructField'
import type { FieldPresence } from './fieldPresence'

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

  switch (wellKnownKind(message)) {
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
      return isWrapperDesc(message)
        ? <WrapperField name={fieldName} desc={message} value={value} onChange={onChange} />
        : null
    case null:
      return null
  }
}
