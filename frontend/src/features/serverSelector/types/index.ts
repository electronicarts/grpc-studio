// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ApiServer } from '@/types/grpc'
import type { ServerStatus } from '@grpc-studio/shared'

export interface ServerSelectorProps {
  selectedServerNames: string[]
  onServerSelect: (serverNames: string[]) => void
}

export interface UseServerSelectorReturn {
  servers: ApiServer[]
  serverStatuses: ServerStatus[]
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  toggleServer: (serverName: string) => void
  displayText: string
  reload: (targetName?: string) => void
  reloading: boolean
}

export interface ServerItemProps {
  server: ApiServer
  serverStatus?: ServerStatus
  isSelected: boolean
  onToggle: (serverName: string) => void
}
