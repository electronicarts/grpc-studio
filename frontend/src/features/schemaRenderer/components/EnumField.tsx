// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { DescEnum } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../stores/schemaRendererContext'
import { FormField } from '../../../components/shared'

interface EnumFieldProps {
  name: string
  enumDesc: DescEnum
  value: string | number | undefined
  onChange: (value: string | number | undefined) => void
}

const EnumField: React.FC<EnumFieldProps> = ({ name, enumDesc, value, onChange }) => {
  const { readOnly } = useProtoMessageRendererContext()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return
    const newValue = e.target.value || undefined
    onChange(newValue)
  }

  return (
    <FormField label={name}>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={readOnly}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 disabled:opacity-50"
      >
        <option value="">Select {name}</option>
        {enumDesc.values.map((ev) => (
          <option key={ev.name} value={ev.name}>{ev.name}</option>
        ))}
      </select>
    </FormField>
  )
}

export default EnumField
