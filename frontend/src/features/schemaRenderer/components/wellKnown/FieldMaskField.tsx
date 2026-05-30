// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Input } from '@/components/ui/input'
import { FormField } from '../../../../components/shared'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

interface FieldMaskFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

// Proto3 JSON encodes google.protobuf.FieldMask as a comma-separated string of
// lowerCamelCase field paths, e.g. "user.displayName,email".
// bufbuild converts camelCase → snake_case internally on decode.
const FieldMaskField: React.FC<FieldMaskFieldProps> = ({ name, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()
  const displayValue = typeof value === 'string' ? value : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return
    onChange(e.target.value || undefined)
  }

  return (
    <FormField label={name}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder='lowerCamelCase paths e.g. "user.displayName,email"'
          disabled={readOnly}
          className="w-full font-mono text-sm"
        />
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">field mask</span>
      </div>
    </FormField>
  )
}

export default FieldMaskField
