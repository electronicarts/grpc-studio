// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useSchemaLoaderContext } from '../stores/schemaLoaderContext'

/**
 * Centralized notifications for schema loading/reloading states
 * Shows loading banner (success state is shown in AppHeader button)
 */
export function SchemaLoaderNotifications() {
  const { reloading } = useSchemaLoaderContext()

  return (
    <>
      {/* Reloading Banner */}
      {reloading && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-info/30 bg-info/10 p-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="size-5 animate-spin text-info" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-info">Refreshing schemas...</p>
              <p className="text-xs text-info">Discovering services from all servers</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
