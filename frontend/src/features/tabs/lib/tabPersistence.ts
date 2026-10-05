// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * TabPersistence — Web Storage read/write for the open tabs and active tab.
 *
 * Each browser tab keeps its own copy in sessionStorage, so two windows of the
 * app can't overwrite each other's tabs, and a reload restores that window's
 * own tabs. localStorage holds the most recently saved set and is only read to
 * seed a browser tab with no session state yet (new window, browser restart).
 */
import type { MethodTab } from '../types'
import { safeGetJSON, safeSetJSON } from '@/utils/storageHelpers'

const TABS_KEY = 'grpc-studio-tabs'
const ACTIVE_TAB_KEY = 'grpc-studio-active-tab'

export interface PersistedTabs {
  tabs: MethodTab[]
  activeTabId: string | null
}

export function restoreTabs(): PersistedTabs {
  const sessionTabs = safeGetJSON<MethodTab[]>(TABS_KEY, 'session')
  if (sessionTabs) {
    return { tabs: sessionTabs, activeTabId: safeGetJSON<string>(ACTIVE_TAB_KEY, 'session') }
  }
  return {
    tabs: safeGetJSON<MethodTab[]>(TABS_KEY) ?? [],
    activeTabId: safeGetJSON<string>(ACTIVE_TAB_KEY),
  }
}

export function persistTabs(tabs: MethodTab[]) {
  safeSetJSON(TABS_KEY, tabs, 'session')
  safeSetJSON(TABS_KEY, tabs)
}

export function persistActiveTab(activeTabId: string | null) {
  safeSetJSON(ACTIVE_TAB_KEY, activeTabId, 'session')
  safeSetJSON(ACTIVE_TAB_KEY, activeTabId)
}
