// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescField } from '@bufbuild/protobuf'
import { isStructType, isTimestampType, wrapperPrimitiveType } from '../../../utils/descUtils'
import TimestampField from './TimestampField'
import MessageRenderer from './MessageRenderer'
import MessageFieldFrame from './MessageFieldFrame'
import StructField from './StructField'
import WrapperField from './WrapperField'

interface NestedMessageFieldProps {
  field: DescField & { fieldKind: 'message' }
  value: unknown
  onChange: (value: unknown) => void
  path: string
}

const NestedMessageField: React.FC<NestedMessageFieldProps> = ({ field, value, onChange, path }) => {
  const typeName = field.message.typeName

  if (isTimestampType(typeName)) {
    return <TimestampField fieldName={field.name} value={value} onChange={onChange} />
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

export default NestedMessageField
