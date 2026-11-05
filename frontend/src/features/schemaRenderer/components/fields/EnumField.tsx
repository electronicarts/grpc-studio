// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescEnum } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '@/features/schemaRenderer/stores/schemaRendererContext'
import { FormField } from '@/components/shared'
import { Select } from '@/components/ui/select'

interface EnumFieldProps {
  name: string
  enumDesc: DescEnum
  value: string | number | undefined
  onChange: (value: string | number | undefined) => void
}

const EnumField: React.FC<EnumFieldProps> = ({ name, enumDesc, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || undefined
    onChange(newValue)
  }

  const typeMeta = <span className="text-xs text-muted-foreground">({enumDesc.typeName})</span>

  return (
    <FormField label={name} labelMeta={typeMeta}>
      <Select value={value || ''} onChange={handleChange} disabled={readOnly}>
        {/* Placeholder only; a set field is unset through its checkbox (or the oneof selection). */}
        {!value && <option value="">Select {name}</option>}
        {enumDesc.values.map(ev => (
          <option key={ev.name} value={ev.name}>
            {ev.name}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

export default EnumField
