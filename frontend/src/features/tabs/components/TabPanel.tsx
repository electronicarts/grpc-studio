// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { MethodExplorer } from '@/features/methodExplorer'
import { useHasLiveWork } from '@/stores'
import type { MethodTab } from '../types'

interface TabPanelProps {
  tab: MethodTab
  isActive: boolean
}

/**
 * Renders one tab's MethodExplorer, applying the mount rule:
 *   mounted = active OR has live work (in-flight invocation / active stream).
 *
 * Idle, non-active tabs render nothing — their state is preserved in the
 * per-tab store and rehydrated when they mount again. The active tab is
 * visible; a live-but-inactive tab stays mounted (hidden) so its stream keeps
 * receiving.
 */
export const TabPanel: React.FC<TabPanelProps> = ({ tab, isActive }) => {
  const hasLiveWork = useHasLiveWork(tab.id)

  if (!isActive && !hasLiveWork) return null

  return (
    <div className={isActive ? '' : 'hidden'}>
      <MethodExplorer
        tabId={tab.id}
        selectedTarget={tab.target}
        selectedMethod={tab.method}
        selectedService={tab.service}
        initialRequestBody={tab.requestBody}
      />
    </div>
  )
}
