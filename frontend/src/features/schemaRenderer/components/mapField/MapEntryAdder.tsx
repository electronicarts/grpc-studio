// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { KeyInputAdder } from '../fieldControls/KeyInputAdder'
import { setObjectEntry } from '../../utils/collectionMutation'

interface MapEntryAdderProps {
  isScalarValue: boolean
  mapValue: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function MapEntryAdder({ isScalarValue, mapValue, onChange }: MapEntryAdderProps) {
  return (
    <KeyInputAdder
      keyPlaceholder="Key"
      keyClassName="w-32"
      valuePlaceholder={isScalarValue ? 'Value' : undefined}
      testId="mapField-addEntryButton"
      onAdd={(key, nextValue) => {
        onChange(setObjectEntry(mapValue, key, isScalarValue ? nextValue : {}))
      }}
    />
  )
}
