// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * SelectableButton — a clickable block whose text can still be selected and copied.
 *
 * Browsers don't allow selecting text inside a <button>, so this renders a
 * <div role="button"> with keyboard activation (Enter / Space). A click that
 * ends a text selection inside it (drag-to-select) doesn't activate it.
 */
export interface SelectableButtonProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  onActivate: () => void
}

// A drag-to-select that started or ended inside the element.
function hasSelectionWithin(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return false
  return element.contains(selection.anchorNode) || element.contains(selection.focusNode)
}

export const SelectableButton = React.forwardRef<HTMLDivElement, SelectableButtonProps>(
  ({ className, onActivate, onKeyDown, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hasSelectionWithin(e.currentTarget)) return
      onActivate()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e)
      if (e.defaultPrevented || e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault() // keep Space from scrolling the page
        onActivate()
      }
    }

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        {...props}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      />
    )
  }
)
SelectableButton.displayName = 'SelectableButton'
