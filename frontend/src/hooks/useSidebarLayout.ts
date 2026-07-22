// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback, useState } from 'react'
import { safeGetJSON, safeSetJSON } from '@/utils/storageHelpers'

const COLLAPSED_STORAGE_KEY = 'grpc-studio-sidebar-collapsed'

export interface SidebarLayout {
  /** Whether the sidebar is collapsed to a thin rail (desktop) / hidden (mobile). */
  collapsed: boolean
  toggleCollapsed: () => void
}

/**
 * useSidebarLayout — owns the persisted collapsed state for the service-explorer
 * sidebar. Lives in the page so both the sidebar chrome and the explorer header
 * (which hosts the collapse button) can share one source of truth.
 */
export function useSidebarLayout(): SidebarLayout {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => safeGetJSON<boolean>(COLLAPSED_STORAGE_KEY) === true
  )

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      safeSetJSON(COLLAPSED_STORAGE_KEY, next)
      return next
    })
  }, [])

  return { collapsed, toggleCollapsed }
}
