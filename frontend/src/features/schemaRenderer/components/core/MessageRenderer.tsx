// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescMessage, DescField } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { setFieldValue } from '../../utils'
import { getFieldValue } from '../../utils/fieldOperations'
import { filterFields } from '../../utils/fieldFiltering'
import FieldRenderer from './FieldRenderer'
import OneOfField from '../fields/OneOfField'

interface MessageRendererProps {
  schema: DescMessage
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  basePath?: string
  isRoot?: boolean
}

const MessageRenderer: React.FC<MessageRendererProps> = ({
  schema,
  value,
  onChange,
  basePath = '',
  isRoot = false
}) => {
  const { searchQuery, hideEmptyFields } = useProtoMessageRendererContext()

  const { filteredRegular, filteredOneOf } = filterFields(schema, value, {
    searchQuery,
    hideEmptyFields,
    isRoot
  })

  return (
    <div className="space-y-4">
      {/* Render oneOf groups first */}
      {filteredOneOf.map((oneof) => (
        <div key={oneof.name}>
          <OneOfField
            oneof={oneof}
            value={value}
            onChange={onChange}
            basePath={basePath}
          />
        </div>
      ))}

      {/* Render regular fields */}
      {filteredRegular.map((field: DescField) => (
        <div key={field.name}>
          <FieldRenderer
            field={field}
            value={getFieldValue(value, field.name)}
            onChange={val => onChange(setFieldValue(value, field.name, val))}
            path={basePath ? `${basePath}.${field.name}` : field.name}
          />
        </div>
      ))}
      
      {isRoot && searchQuery && filteredRegular.length === 0 && filteredOneOf.length === 0 && (
        <div className="text-sm text-gray-500 italic py-4 text-center">
          No fields matching "{searchQuery}"
        </div>
      )}
      
      {isRoot && hideEmptyFields && !searchQuery && filteredRegular.length === 0 && filteredOneOf.length === 0 && (
        <div className="text-sm text-gray-500 italic py-4 text-center">
          No populated fields in response
        </div>
      )}
    </div>
  )
}

export default MessageRenderer
