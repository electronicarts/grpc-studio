// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { setFieldValue } from '../../utils'
import { getFieldValue } from '../../utils/fieldOperations'
import { filterMembers } from '../../utils/fieldFiltering'
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

  const members = filterMembers(schema, value, {
    searchQuery,
    hideEmptyFields,
    isRoot
  })

  return (
    <div className="space-y-4">
      {/* Fields and oneof groups in .proto source order */}
      {members.map(member => (
        <div key={`${member.kind}:${member.name}`}>
          {member.kind === 'oneof' ? (
            <OneOfField oneof={member} value={value} onChange={onChange} basePath={basePath} />
          ) : (
            <FieldRenderer
              field={member}
              value={getFieldValue(value, member.name)}
              onChange={val => onChange(setFieldValue(value, member.name, val))}
              path={basePath ? `${basePath}.${member.name}` : member.name}
            />
          )}
        </div>
      ))}

      {isRoot && searchQuery && members.length === 0 && (
        <div className="py-4 text-center text-sm italic text-muted-foreground">
          No fields matching "{searchQuery}"
        </div>
      )}
      
      {isRoot && hideEmptyFields && !searchQuery && members.length === 0 && (
        <div className="py-4 text-center text-sm italic text-muted-foreground">
          No populated fields in response
        </div>
      )}
    </div>
  )
}

export default MessageRenderer
