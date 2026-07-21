// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Input } from '@/components/ui/input'
import { FormField } from '../../../../components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

interface DurationFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

// Proto3 JSON encodes google.protobuf.Duration as a string ending in "s",
// e.g. "86400s" (1 day), "1.5s" (1.5 seconds), "0s".
// We render a plain text input so the value is always kept as a string,
// matching what toJson/fromJson expect for Duration fields.
const DurationField: React.FC<DurationFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const displayValue = typeof value === 'string' ? value : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    onChange(e.target.value || undefined)
  }

  const typeMeta = <span className="text-xs text-muted-foreground">(google.protobuf.Duration)</span>

  return (
    <FormField label={name} labelMeta={typeMeta}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder='seconds + "s", e.g. 86400s, 1.5s'
          disabled={readOnly}
          className="w-full font-mono text-sm"
        />
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">duration</span>
      </div>
    </FormField>
  )
}

export default DurationField
