// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useMemo } from 'react'
import { useConnectionStatus } from '@/features/connectionValidator'
import { useSchemaLoader, useSchemas } from '@/features/schemaLoader'
import type { UseServerSelectorReturn } from '../types'

interface UseServerSelectorProps {
  selectedServerNames: string[]
  onServerSelect: (serverNames: string[]) => void
}

export function useServerSelector({
  selectedServerNames,
  onServerSelect,
}: UseServerSelectorProps): UseServerSelectorReturn {
  const { servers: unsortedServers } = useSchemas()

  // Display target servers in a stable alphabetical order by name, regardless of
  // the order the backend/config returns them in.
  const servers = useMemo(
    () => [...unsortedServers].sort((a, b) => a.name.localeCompare(b.name)),
    [unsortedServers]
  )

  const { servers: serverStatuses } = useConnectionStatus()
  const { reload, reloading } = useSchemaLoader()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const toggleServer = (serverName: string) => {
    if (selectedServerNames.includes(serverName)) {
      onServerSelect(selectedServerNames.filter(name => name !== serverName))
    } else {
      onServerSelect([...selectedServerNames, serverName])
    }
  }

  const displayText = useMemo(() => {
    if (selectedServerNames.length === 0) {
      return `All Servers (${servers.length})`
    }
    if (selectedServerNames.length === 1) {
      return selectedServerNames[0]
    }
    return `${selectedServerNames.length} Servers Selected`
  }, [selectedServerNames, servers.length])

  return {
    servers,
    serverStatuses,
    isDropdownOpen,
    setIsDropdownOpen,
    toggleServer,
    displayText,
    reload,
    reloading,
  }
}
