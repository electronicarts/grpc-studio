// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import { renderWellKnownType } from '@/features/schemaRenderer/components/shared/WellKnownTypeRenderer'
import MessageRenderer from '@/features/schemaRenderer/components/core/MessageRenderer'
import MessageFieldFrame from '@/features/schemaRenderer/components/shared/MessageFieldFrame'
import type { FieldPresence } from '@/features/schemaRenderer/components/shared/fieldPresence'

interface MessageFieldProps {
  field: DescField & { fieldKind: 'message' }
  value: unknown
  onChange: (value: unknown) => void
  path: string
  presence?: FieldPresence
}

const MessageField: React.FC<MessageFieldProps> = ({ field, value, onChange, path, presence }) => {
  const typeName = field.message.typeName

  // Try rendering as a well-known type with a specialized component
  const wktComponent = renderWellKnownType({
    message: field.message,
    fieldName: field.name,
    value,
    onChange,
    path,
    presence,
  })

  if (wktComponent) {
    return wktComponent
  }

  // Not a WKT - render as regular nested message
  return (
    <MessageFieldFrame name={field.name} typeName={typeName} path={path} presence={presence}>
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
