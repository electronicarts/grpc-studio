// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useSyncExternalStore } from 'react'
import { tabStateStore } from './tabStateStore'

/**
 * Reactive predicate: does the given tab currently have live work (in-flight
 * invocation or active stream)? Playground uses this to keep such tabs mounted
 * even when they're not the active tab.
 */
export function useHasLiveWork(tabId: string): boolean {
  return useSyncExternalStore(
    (cb) => tabStateStore.subscribe(cb),
    () => tabStateStore.hasLiveWork(tabId),
  )
}
