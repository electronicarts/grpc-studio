// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * SegmentedControl — a row of mutually exclusive options (view tabs, Full/Wire, …). It is a labelled group of
 * toggle buttons: the selected one has `aria-pressed`. Put SegmentedControlItem elements inside.
 */
export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  'aria-label': string
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ className, ...props }) => (
  <div role="group" className={cn('flex items-center rounded-lg bg-muted p-0.5', className)} {...props} />
)

export interface SegmentedControlItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  selected: boolean
}

export const SegmentedControlItem: React.FC<SegmentedControlItemProps> = ({ selected, className, ...props }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
      selected
        ? 'bg-white text-foreground shadow-sm dark:bg-gray-700'
        : cn(
          'text-gray-700 hover:bg-white/60 hover:text-gray-900',
          'dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white',
        ),
      className,
    )}
    {...props}
  />
)
