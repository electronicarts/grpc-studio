// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * IconButton — a square, bordered button for a single icon (refresh, close, etc.).
 * Centralizes the bordered-icon-control look with token-based hover/disabled states.
 */
export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'rounded-lg border border-input p-2 text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
IconButton.displayName = 'IconButton'
