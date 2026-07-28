// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { safeGetJSON, safeSetJSON } from '@/utils/storageHelpers'
import type { MethodTab, UseMethodTabsProps, UseMethodTabsReturn } from '../types'
import { makeTabId, matchesSelection, nextDuplicateId, type TabSelection } from '../utils/tabIdentity'
import { tabStateStore } from '@/stores'

const TABS_STORAGE_KEY = 'grpc-studio-tabs'
const ACTIVE_TAB_STORAGE_KEY = 'grpc-studio-active-tab'

export function useMethodTabs({
  selectedTarget,
  selectedService,
  selectedMethod,
  sharedRequestBody,
  sharedMetadata,
  onClearSelection,
}: UseMethodTabsProps): UseMethodTabsReturn {
  const [tabs, setTabs] = useState<MethodTab[]>(() => safeGetJSON<MethodTab[]>(TABS_STORAGE_KEY) ?? [])
  const [activeTabId, setActiveTabId] = useState<string | null>(() => safeGetJSON<string>(ACTIVE_TAB_STORAGE_KEY))

  // The current sidebar selection, when a full method is selected.
  // Memoized on the identity-defining fields so effect/callback deps stay stable.
  const selection = useMemo<TabSelection | null>(
    () =>
      selectedTarget && selectedService && selectedMethod
        ? { target: selectedTarget, service: selectedService, method: selectedMethod }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTarget, selectedService?.fullName, selectedMethod?.name]
  )

  // Use ref to avoid stale closures
  const onClearSelectionRef = useRef(onClearSelection)
  useEffect(() => {
    onClearSelectionRef.current = onClearSelection
  }, [onClearSelection])

  // Persist tabs / active tab to localStorage
  useEffect(() => {
    safeSetJSON(TABS_STORAGE_KEY, tabs)
  }, [tabs])

  useEffect(() => {
    safeSetJSON(ACTIVE_TAB_STORAGE_KEY, activeTabId)
  }, [activeTabId])

  // When a method is selected from the sidebar, open it in a new tab or switch to existing.
  // A tab's identity includes its target, so the same method on two servers is distinct.
  useEffect(() => {
    if (!selection) return

    // Already viewing a tab for this selection (a canonical tab OR a duplicate) —
    // leave it alone so duplicates don't get their focus stolen back.
    const active = tabs.find(t => t.id === activeTabId)
    if (active && matchesSelection(active, selection)) return

    // Switch to an existing matching tab if there is one.
    const existing = tabs.find(t => matchesSelection(t, selection))
    if (existing) {
      setActiveTabId(existing.id)
      return
    }

    // Otherwise open a fresh canonical tab.
    const tabId = makeTabId(selection.target, selection.service, selection.method)
    const newTab: MethodTab = {
      id: tabId,
      target: selection.target,
      service: selection.service,
      method: selection.method,
      label: selection.method.name,
      requestBody: sharedRequestBody || undefined,
      metadata: sharedMetadata || undefined,
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
  }, [selection, sharedRequestBody, sharedMetadata, activeTabId, tabs])

  // Open another copy of an existing tab, so the same method can live in multiple tabs.
  const duplicateTab = useCallback((sourceTabId: string) => {
    const source = tabs.find(t => t.id === sourceTabId)
    if (!source) return
    const newId = nextDuplicateId(source, tabs)
    setTabs(prev => [...prev, { ...source, id: newId }])
    setActiveTabId(newId)
  }, [tabs])

  const closeTab = useCallback((tabId: string) => {
    // Drop the tab's stored state; its id is deterministic, so a leftover
    // slice would resurrect stale data if the same method is reopened.
    tabStateStore.remove(tabId)

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)

      // If closing active tab, switch to another
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          const closingIndex = prev.findIndex(t => t.id === tabId)
          const newActiveIndex = Math.max(0, closingIndex - 1)
          setActiveTabId(newTabs[newActiveIndex]?.id || null)
        } else {
          setActiveTabId(null)
        }
      }

      return newTabs
    })

    // Clear the sidebar selection when the closed tab was the selected method.
    if (selection && tabId === makeTabId(selection.target, selection.service, selection.method)) {
      onClearSelectionRef.current?.()
    }
  }, [activeTabId, selection])

  const closeAllTabs = useCallback(() => {
    tabStateStore.clearAll()
    setTabs([])
    setActiveTabId(null)
    onClearSelectionRef.current?.()
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId) || null

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    closeTab,
    closeAllTabs,
    duplicateTab,
  }
}
