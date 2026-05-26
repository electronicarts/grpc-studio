// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface KeyInputAdderProps {
  keyPlaceholder: string
  valuePlaceholder?: string
  keyClassName?: string
  valueClassName?: string
  buttonClassName?: string
  buttonLabel?: string
  buttonIconClassName?: string
  testId?: string
  onAdd: (key: string, value: string) => void
}

export function KeyInputAdder({
  keyPlaceholder,
  valuePlaceholder,
  keyClassName,
  valueClassName = 'flex-1',
  buttonClassName,
  buttonLabel,
  buttonIconClassName = 'w-4 h-4',
  testId,
  onAdd,
}: KeyInputAdderProps) {
  const keyRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)

  const handleAddClick = () => {
    const keyInput = keyRef.current
    const key = keyInput?.value.trim()
    if (!keyInput || !key) return

    onAdd(key, valueRef.current?.value ?? '')

    keyInput.value = ''
    if (valueRef.current) valueRef.current.value = ''
  }

  return (
    <div className="flex gap-2">
      <Input ref={keyRef} placeholder={keyPlaceholder} className={keyClassName} />
      {valuePlaceholder && (
        <Input ref={valueRef} placeholder={valuePlaceholder} className={valueClassName} />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddClick}
        className={buttonClassName}
        data-testid={testId}
      >
        <Plus className={buttonIconClassName} />
        {buttonLabel}
      </Button>
    </div>
  )
}
