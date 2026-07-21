// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcMethod, GrpcService } from '@/types/grpc'

export interface MethodTab {
  id: string
  target: string
  service: GrpcService
  method: GrpcMethod
  label: string
  requestBody?: Record<string, unknown>
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
  sharedRequestBody: Record<string, unknown> | null
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
