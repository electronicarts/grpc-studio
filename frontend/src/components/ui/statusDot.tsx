// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { cn } from '@/utils/cn'
import { TONES } from '@/utils/tones'

/**
 * StatusDot — the small connected/disconnected indicator dot. One definition for the
 * green/red status circle used in server lists and status rows.
 */
export interface StatusDotProps {
  connected: boolean
  className?: string
}

export function StatusDot({ connected, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'size-2 flex-shrink-0 rounded-full',
        connected ? TONES.success.bgSolid : TONES.danger.bgSolid,
        className
      )}
    />
  )
}
