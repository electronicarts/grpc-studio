// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import { isStructType, isTimestampType, wrapperPrimitiveType } from '../../../../utils/descUtils'
import TimestampField from '../wellKnown/TimestampField'
import MessageRenderer from '../core/MessageRenderer'
import MessageFieldFrame from '../shared/MessageFieldFrame'
import StructField from '../struct/StructField'
import WrapperField from '../wellKnown/WrapperField'

interface MessageFieldProps {
  field: DescField & { fieldKind: 'message' }
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

const MessageField: React.FC<MessageFieldProps> = ({ field, value, onChange, path }) => {
  const typeName = field.message.typeName

  if (isTimestampType(typeName)) {
    return <TimestampField name={field.name} value={value} onChange={onChange} />
  }

  if (isStructType(typeName)) {
    return (
      <StructField
        name={field.name}
        typeName={typeName}
        value={value}
        onChange={onChange as (value: Record<string, unknown>) => void}
        path={path}
      />
    )
  }

  if (wrapperPrimitiveType(typeName)) {
    return <WrapperField name={field.name} typeName={typeName} value={value} onChange={onChange} />
  }

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
