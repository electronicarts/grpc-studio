// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import type { DescField, DescOneof } from '@bufbuild/protobuf'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { getFieldValue } from '../../utils/fieldOperations'
import { setFieldValue } from '../../utils'
import { fieldTypeName } from '../../../../utils/descUtils'
import FieldRenderer from '../core/FieldRenderer'

interface OneOfFieldProps {
  oneof: DescOneof
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  basePath: string
}

const OneOfField: React.FC<OneOfFieldProps> = ({ oneof, value, onChange, basePath }) => {
  const { readOnly, oneOfSelections, setOneOfSelection } = useProtoMessageRendererContext()

  const selectionKey = basePath ? `${basePath}.${oneof.name}` : oneof.name
  const fields = oneof.fields as unknown as DescField[]
  
  let selectedField = oneOfSelections.get(selectionKey) || ''
  
  if (!selectedField && value) {
    for (const field of fields) {
      const fieldValue = getFieldValue(value, field.name)
      if (fieldValue !== undefined && fieldValue !== null) {
        if (typeof fieldValue === 'object' && !Array.isArray(fieldValue) && Object.keys(fieldValue as object).length === 0) {
          continue
        }
        selectedField = field.name
        break
      }
    }
  }

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return

    const fieldName = e.target.value
    setOneOfSelection(selectionKey, fieldName)
    const newValue = { ...value }
    fields.forEach(f => {
      delete newValue[f.name]
    })
    if (fieldName) {
      const field = fields.find(f => f.name === fieldName)
      if (field) {
        // Initialize with default value for message types, omit scalars/enums until user provides value
        if (field.fieldKind !== 'scalar' && field.fieldKind !== 'enum') {
          newValue[fieldName] = {}
        }
        // For scalar/enum, don't set the key - let the user provide the value
      }
    }
    onChange(newValue)
  }

  const selected = fields.find(f => f.name === selectedField)

  return (
    <div className="space-y-3 rounded-lg border-2 border-brand/30 bg-brand/10 p-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-brand text-white">oneof</Badge>
        <span className="font-medium text-foreground">{oneof.name}</span>
      </div>

      <Select
        value={selectedField}
        onChange={handleSelectionChange}
        disabled={readOnly}
        className="border-brand/30"
      >
        <option value="">Select an option</option>
        {fields.map(f => (
          <option key={f.name} value={f.name}>
            {f.name} ({fieldTypeName(f)})
          </option>
        ))}
      </Select>

      {selected && (
        <div className="mt-3 border-t border-brand/30 pt-3">
          <FieldRenderer
            field={selected}
            value={getFieldValue(value, selected.name)}
            onChange={val => onChange(setFieldValue(value, selected.name, val))}
            path={basePath ? `${basePath}.${selected.name}` : selected.name}
          />
        </div>
      )}
    </div>
  )
}

export default OneOfField
