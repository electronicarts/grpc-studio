// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * SearchInput — a text input with a leading search icon. Centralizes the search-box
 * look (icon + rounded bordered field) used in the service explorer and elsewhere.
 */
export type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        type="text"
        className={cn(
          'w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      />
    </div>
  )
)
SearchInput.displayName = 'SearchInput'
