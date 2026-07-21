// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { FormField } from '../../../../components/shared'
import { MuiDateTimePicker } from '../../../../components/ui/mui-datetime-picker'

interface TimestampFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

const TimestampField: React.FC<TimestampFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  // Convert value to ISO string format expected by MUI picker
  const isoValue = typeof value === 'string' && value ? value : undefined

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue)
  }

  const typeMeta = <span className="text-xs text-muted-foreground">(google.protobuf.Timestamp)</span>

  return (
    <FormField label={name} labelMeta={typeMeta}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MuiDateTimePicker
            value={isoValue}
            onChange={handleChange}
            disabled={readOnly}
          />
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">UTC</span>
      </div>
    </FormField>
  )
}

export default TimestampField
