// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import { removeArrayItem, replaceArrayItem } from '../../utils/collectionMutation'
import { StructValue } from './StructValue'

interface StructArrayItemsProps {
  value: unknown[]
  onChange: (value: unknown[]) => void
}

export function StructArrayItems({ value, onChange }: StructArrayItemsProps) {
  const { readOnly } = useProtoMessageRendererContext()

  const updateItem = (index: number, nextValue: unknown) => {
    onChange(replaceArrayItem(value, index, nextValue))
  }

  const removeItem = (index: number) => {
    onChange(removeArrayItem(value, index))
  }

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <StructValue
          key={index}
          label={`Item ${index + 1}`}
          value={item}
          onChange={(nextValue) => updateItem(index, nextValue)}
          onRemove={!readOnly ? () => removeItem(index) : undefined}
        />
      ))}

      {value.length === 0 && (
        <div className="text-sm italic text-muted-foreground">No items</div>
      )}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, ''])}
          data-testid="structField-addItemButton"
        >
          <Plus className="mr-1 size-3" />
          Add item
        </Button>
      )}
    </div>
  )
}
