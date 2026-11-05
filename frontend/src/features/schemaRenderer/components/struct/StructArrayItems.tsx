// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { removeArrayItem, replaceArrayItem } from '@/features/schemaRenderer/utils/collectionMutation'
import AddButton from '@/features/schemaRenderer/components/shared/AddButton'
import StructValue from '@/features/schemaRenderer/components/struct/StructValue'

interface StructArrayItemsProps {
  value: unknown[]
  onChange: (value: unknown[]) => void
}

const StructArrayItems: React.FC<StructArrayItemsProps> = ({ value, onChange }) => {
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
          onChange={nextValue => updateItem(index, nextValue)}
          onRemove={() => removeItem(index)}
        />
      ))}

      {value.length === 0 && <div className="text-sm italic text-muted-foreground">No items</div>}

      <AddButton noun="item" onClick={() => onChange([...value, ''])} testId="structField-addItemButton" />
    </div>
  )
}

export default StructArrayItems
