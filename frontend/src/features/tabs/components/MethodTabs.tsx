// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Copy, X } from 'lucide-react'
import type { MethodTabsProps } from '../types'

export const MethodTabs: React.FC<MethodTabsProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabDuplicate,
  onCloseAll,
}) => {
  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="border-b border-border bg-muted">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex flex-shrink-0 cursor-pointer items-center gap-2 border-r border-border px-4 py-3 transition-colors ${
                activeTabId === tab.id
                  ? 'bg-card font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
              onClick={() => onTabSelect(tab.id)}
            >
              <span className="max-w-xs truncate text-sm">
                {tab.label}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTabDuplicate(tab.id)
                }}
                className="ml-1 rounded p-1 transition-colors hover:bg-accent"
                aria-label="Duplicate tab"
                title="Open another copy of this method"
              >
                <Copy className="size-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className="rounded p-1 transition-colors hover:bg-accent"
                aria-label="Close tab"
                title="Close tab"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {tabs.length > 1 && (
          <button
            onClick={onCloseAll}
            className="mx-2 flex-shrink-0 rounded px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close all tabs"
          >
            Close All
          </button>
        )}
      </div>
    </div>
  )
}
