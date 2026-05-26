// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { KeyInputAdder } from '../fieldControls/KeyInputAdder'

interface StructFieldAdderProps {
  onAdd: (key: string) => void
}

export function StructFieldAdder({ onAdd }: StructFieldAdderProps) {
  return (
    <KeyInputAdder
      keyPlaceholder="Field name"
      keyClassName="h-8 max-w-56"
      buttonClassName="h-8"
      buttonLabel="Add"
      buttonIconClassName="w-3 h-3 mr-1"
      testId="structField-addButton"
      onAdd={(key) => onAdd(key)}
    />
  )
}
