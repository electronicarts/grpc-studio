// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// App-level shared session stores (neutral ground between features).
export { tabStateStore } from '@/stores/tabStateStore'
export type {
  TabStateSnapshot,
  TabRequestSnapshot,
  TabResponseSnapshot,
  TabStreamSnapshot,
} from '@/stores/tabStateStore'
export { useHasLiveWork } from '@/stores/useLiveWorkTabs'
