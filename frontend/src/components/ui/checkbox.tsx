// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Checkbox — a themed checkbox that is still a native <input type="checkbox">, so labels, keyboard,
 * forms, screen readers and `getByRole('checkbox')` keep working. The box is drawn with tokens and the
 * tick is an icon shown while checked. `className` applies to the wrapper, e.g. for alignment margins.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <span className={cn('relative inline-flex size-4 shrink-0', className)}>
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'peer size-4 cursor-pointer appearance-none rounded-[4px] border border-muted-foreground/50 bg-background shadow-sm transition-colors',
        'checked:border-info checked:bg-info hover:border-info',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
      {...props}
    />
    <Check
      aria-hidden
      strokeWidth={3}
      className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
    />
  </span>
))
Checkbox.displayName = 'Checkbox'
