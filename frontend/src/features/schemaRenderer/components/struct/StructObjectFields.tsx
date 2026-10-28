// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useKeyedRows } from '../../hooks/useKeyedRows'
import AddButton from '../shared/AddButton'
import KeyInput from '../shared/KeyInput'
import { StructValue } from './StructValue'

interface StructObjectFieldsProps {
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function StructObjectFields({ value, onChange }: StructObjectFieldsProps) {
  const { rows, addRow, keys } = useKeyedRows<unknown>(value, onChange, () => '')

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <StructValue
          key={row.id}
          label={row.key || 'new field'}
          labelEditor={(
            <KeyInput
              value={row.key}
              existingKeys={keys}
              onCommit={row.commitKey}
              placeholder="Field name"
              aria-label="Struct field name"
              autoFocus={row.isPending}
              className="max-w-56"
              renderReadOnly={key => <span className="font-medium text-foreground">{key}</span>}
            />
          )}
          value={row.value}
          onChange={row.setValue}
          onRemove={row.remove}
        />
      ))}

      {rows.length === 0 && (
        <div className="text-sm italic text-muted-foreground">No fields</div>
      )}

      <AddButton noun="field" onClick={addRow} testId="structField-addButton" />
    </div>
  )
}
