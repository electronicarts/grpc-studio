// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import { renderWellKnownType } from '../shared/WellKnownTypeRenderer'
import MessageRenderer from '../core/MessageRenderer'
import MessageFieldFrame from '../shared/MessageFieldFrame'

interface MessageFieldProps {
  field: DescField & { fieldKind: 'message' }
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

const MessageField: React.FC<MessageFieldProps> = ({ field, value, onChange, path }) => {
  const typeName = field.message.typeName

  // Try rendering as a well-known type with a specialized component
  const wktComponent = renderWellKnownType({
    typeName,
    fieldName: field.name,
    value,
    onChange,
    path
  })

  if (wktComponent) {
    return wktComponent
  }

  // Not a WKT - render as regular nested message
  return (
    <MessageFieldFrame name={field.name} typeName={typeName} path={path}>
      <MessageRenderer
        schema={field.message}
        value={(value || {}) as Record<string, unknown>}
        onChange={onChange}
        basePath={path}
      />
    </MessageFieldFrame>
  )
}

export default MessageField
