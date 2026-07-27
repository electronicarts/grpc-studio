// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * Panel — the standard surface container used across the app (server selector,
 * service explorer, response panels, etc.). Owns the rounded-xl + border + card
 * background + shadow shell in ONE place so the look changes here, not in N files.
 *
 * `padded` applies the common p-4; pass `className` to override/add (e.g. p-6, flex
 * layouts, fixed heights). Uses semantic tokens so light/dark come from globals.css.
 */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, padded = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        padded && 'p-4',
        className
      )}
      {...props}
    />
  )
)
Panel.displayName = 'Panel'
