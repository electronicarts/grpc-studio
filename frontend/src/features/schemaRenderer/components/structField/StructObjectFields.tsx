// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { removeObjectEntry, setObjectEntry } from '../../utils/collectionMutation'
import { StructFieldAdder } from './StructFieldAdder'
import { StructValue } from './StructValue'

interface StructObjectFieldsProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function StructObjectFields({ value, onChange }: StructObjectFieldsProps) {
  const { readOnly } = useProtoMessageRendererContext()
  const entries = Object.entries(value)

  const updateFieldValue = (key: string, nextValue: unknown) => {
    onChange(setObjectEntry(value, key, nextValue))
  }

  const removeField = (key: string) => {
    onChange(removeObjectEntry(value, key))
  }

  const addField = (key: string) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) return
    onChange(setObjectEntry(value, key, ''))
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, entryValue]) => (
        <StructValue
          key={key}
          label={key}
          value={entryValue}
          onChange={(nextValue) => updateFieldValue(key, nextValue)}
          onRemove={!readOnly ? () => removeField(key) : undefined}
        />
      ))}

      {entries.length === 0 && (
        <div className="text-sm text-gray-500 italic">No fields</div>
      )}

      {!readOnly && <StructFieldAdder onAdd={addField} />}
    </div>
  )
}
