// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
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
    <div className="space-y-3 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-900/20">
      <div className="flex items-center gap-2">
        <Badge className="bg-purple-500 text-white">oneof</Badge>
        <span className="font-medium text-gray-900 dark:text-gray-100">{oneof.name}</span>
      </div>

      <select
        value={selectedField}
        onChange={handleSelectionChange}
        disabled={readOnly}
        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-gray-800"
      >
        <option value="">Select an option</option>
        {fields.map(f => (
          <option key={f.name} value={f.name}>
            {f.name} ({fieldTypeName(f)})
          </option>
        ))}
      </select>

      {selected && (
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
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
