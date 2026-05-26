// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Input } from '@/components/ui/input'
import { useProtoMessageRendererContext } from '../stores/schemaRendererContext'
import { FormField } from '../../../components/shared'

interface TimestampFieldProps {
  fieldName: string
  value: unknown
  onChange: (value: unknown) => void
}

const TimestampField: React.FC<TimestampFieldProps> = ({ fieldName, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const datetimeValue = typeof value === 'string' ? value.slice(0, 16) : ''

  return (
    <FormField label={fieldName}>
      <div className="flex items-center gap-2">
        <Input
          type="datetime-local"
          value={datetimeValue}
          onChange={e => {
            if (readOnly) return
            onChange(e.target.value ? `${e.target.value}:00.000Z` : undefined)
          }}
          disabled={readOnly}
          className="w-full"
        />
        <span className="text-xs font-medium text-muted-foreground">UTC</span>
      </div>
    </FormField>
  )
}

export default TimestampField
