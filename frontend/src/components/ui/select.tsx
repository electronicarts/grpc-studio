// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * Select — the standard native <select> control. Owns the border/background/padding
 * shell in one place using semantic tokens (border-input, bg-background). Pass options
 * as children (<option>). `className` extends/overrides.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'
