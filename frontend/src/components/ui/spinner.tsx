// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { cn } from '@/utils/cn'

/**
 * Spinner — the CSS ring loading indicator (a rounded element with one highlighted
 * border edge, spinning). Centralizes the spinner that was previously hand-built
 * inline in many places with drifting border widths/colors.
 *
 * size: pixel diameter (maps to size-3/4/6/8). tone picks the ring color scheme:
 * - 'primary'  : muted track + primary highlight (default, on normal surfaces)
 * - 'onAccent' : translucent-white track + white highlight (on a colored/primary button)
 * - 'ring'     : primary ring with transparent top (the big page loader)
 */
export interface SpinnerProps {
  size?: 3 | 4 | 5 | 6 | 8
  tone?: 'primary' | 'onAccent' | 'ring'
  className?: string
}

const SIZE = { 3: 'size-3', 4: 'size-4', 5: 'size-5', 6: 'size-6', 8: 'size-8' } as const

const TONE = {
  primary: 'border-2 border-input border-t-primary',
  onAccent: 'border-2 border-white/30 border-t-white',
  ring: 'border-4 border-primary border-t-transparent',
} as const

export function Spinner({ size = 4, tone = 'primary', className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('animate-spin rounded-full', SIZE[size], TONE[tone], className)}
    />
  )
}
