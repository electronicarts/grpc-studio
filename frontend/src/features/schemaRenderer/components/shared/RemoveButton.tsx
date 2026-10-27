// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface RemoveButtonProps {
  /** What gets removed, used for the accessible name "Remove <label>". */
  label: string
  onClick: () => void
  className?: string
  testId?: string
}

/** The one way to remove something in the renderer: a list item, map entry, struct field, mask path or message. */
const RemoveButton: React.FC<RemoveButtonProps> = ({ label, onClick, className, testId }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    aria-label={`Remove ${label}`}
    title={`Remove ${label}`}
    onClick={onClick}
    className={cn('flex-shrink-0', className)}
    data-testid={testId}
  >
    <X className="size-4" />
  </Button>
)

export default RemoveButton
