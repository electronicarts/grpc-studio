// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

interface AddButtonProps {
  /** What gets added, shown as "Add <noun>". */
  noun: string
  onClick: () => void
  testId?: string
}

/**
 * The one way to add something in the renderer: a list item, map entry, struct field or mask path.
 * It always appends a row that is edited in place, so there is no separate input to "commit".
 * Read-only views render nothing.
 */
const AddButton: React.FC<AddButtonProps> = ({ noun, onClick, testId }) => {
  const { readOnly } = useProtoMessageRendererContext()
  if (readOnly) return null
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} data-testid={testId}>
      <Plus className="mr-1 size-4" /> Add {noun}
    </Button>
  )
}

export default AddButton
