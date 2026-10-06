// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod, GrpcService } from '@/types/grpc'
import type { RequestMetadata } from '@grpc-studio/shared'
import type { PendingShare } from '@/features/serviceExplorer'

export interface MethodTab {
  id: string
  target: string
  service: GrpcService
  method: GrpcMethod
  label: string
  requestBody?: Record<string, unknown>
  metadata?: RequestMetadata
}

export interface MethodTabsProps {
  tabs: MethodTab[]
  activeTabId: string | null
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabDuplicate: (tabId: string) => void
  onCloseAll: () => void
}

export interface UseMethodTabsProps {
  selectedTarget: string | null
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  /** A restored share link waiting to be opened as a tab, if any. */
  pendingShare: PendingShare | null
  /** Called once `pendingShare` has been opened, so it isn't opened again. */
  onShareConsumed: () => void
  onClearSelection?: () => void
}

export interface UseMethodTabsReturn {
  tabs: MethodTab[]
  activeTabId: string | null
  activeTab: MethodTab | null
  setActiveTabId: (id: string | null) => void
  closeTab: (tabId: string) => void
  closeAllTabs: () => void
  duplicateTab: (tabId: string) => void
}
