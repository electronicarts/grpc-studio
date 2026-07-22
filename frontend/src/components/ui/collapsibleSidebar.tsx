// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CollapsibleSidebarProps {
  /** Sidebar content (shown when not collapsed). */
  sidebar: React.ReactNode
  /** Main content — fills the remaining space and takes the full width when collapsed. */
  children: React.ReactNode
  collapsed: boolean
  /** Expand the sidebar again (invoked from the collapsed rail). */
  onExpand: () => void
  className?: string
}

/**
 * CollapsibleSidebar — two-column layout whose sidebar can collapse to hand the full
 * width to the main content. On desktop the expanded sidebar takes a fixed fraction
 * (lg:w-1/4); below the `lg` breakpoint the columns stack, matching the rest of the
 * app's responsive behavior.
 */
export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  sidebar,
  children,
  collapsed,
  onExpand,
  className,
}) => {
  // Collapsed: on desktop show a thin rail with an expand button; on mobile the rail
  // is a full-width button. Either way the main content gets all remaining space.
  if (collapsed) {
    return (
      <div className={cn('flex flex-1 flex-col gap-4 lg:flex-row lg:gap-6', className)}>
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand services panel"
          title="Expand services panel"
          className={cn(
            'flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground',
            'w-full px-4 py-3 lg:w-11 lg:flex-col lg:py-4'
          )}
        >
          <PanelLeftOpen className="size-5" />
          <span className="text-sm font-medium lg:hidden">Show services</span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-1 flex-col gap-6 lg:flex-row', className)}>
      {/* Sidebar */}
      <div className="flex w-full min-w-0 flex-col lg:w-1/4">{sidebar}</div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

CollapsibleSidebar.displayName = 'CollapsibleSidebar'
