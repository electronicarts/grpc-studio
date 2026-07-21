// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * DropdownMenu — a self-contained trigger button + popup menu surface.
 *
 * Owns the trigger styling, the open/close state, the outside-click backdrop, and the
 * menu panel shell (border + popover background + shadow) in ONE place, so every
 * dropdown in the app looks and behaves the same. Consumers pass the menu contents
 * as children (e.g. option rows). Uses semantic tokens for light/dark.
 */
export interface DropdownMenuProps {
  /** Text shown in the trigger button. */
  label: React.ReactNode
  children: React.ReactNode
  /** Optional extra classes for the trigger button. */
  triggerClassName?: string
  /** Optional extra classes for the menu panel. */
  menuClassName?: string
  /**
   * Close the menu when a click happens inside it. Default true (single-select).
   * Set false for multi-select menus (e.g. checkboxes) that should stay open.
   */
  closeOnInsideClick?: boolean
}

export function DropdownMenu({
  label,
  children,
  triggerClassName,
  menuClassName,
  closeOnInsideClick = true,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-input bg-card px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          triggerClassName
        )}
      >
        <span className="truncate font-medium">{label}</span>
        <ChevronDown
          className={cn('ml-2 size-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          {/* Backdrop closes the menu on outside click. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-input bg-popover shadow-lg',
              menuClassName
            )}
          >
            {/* Single-select menus close on inside click; multi-select stay open. */}
            <div onClick={closeOnInsideClick ? () => setOpen(false) : undefined}>{children}</div>
          </div>
        </>
      )}
    </div>
  )
}
