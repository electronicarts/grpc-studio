// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { RefreshCw } from 'lucide-react'
import { useServerSelector } from '../hooks/useServerSelector'
import { ServerItem } from './ServerItem'
import { Panel } from '@/components/ui/panel'
import { DropdownMenu } from '@/components/ui/dropdownMenu'
import type { ServerSelectorProps } from '../types'

export function ServerSelector({ selectedServerNames, onServerSelect }: ServerSelectorProps) {
  const {
    servers,
    serverStatuses,
    toggleServer,
    displayText,
    reload,
    reloading,
  } = useServerSelector({ selectedServerNames, onServerSelect })

  const handleRefresh = () => {
    if (selectedServerNames.length === 0) {
      reload()
    } else if (selectedServerNames.length === 1) {
      reload(selectedServerNames[0])
    } else {
      // For multiple servers, refresh all (backend doesn't support multi-target refresh yet)
      reload()
    }
  }

  const refreshTooltip = selectedServerNames.length === 0
    ? "Refresh all servers"
    : selectedServerNames.length === 1
    ? `Refresh ${selectedServerNames[0]}`
    : `Refresh ${selectedServerNames.length} selected servers`

  return (
    <Panel padded>
      <div className="flex items-center gap-4">
        {/* Label */}
        <label className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground/90">
          <svg className="size-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Target Servers:
        </label>

        {/* Server Multi-Select Dropdown — stays open across selections. */}
        <DropdownMenu label={displayText} closeOnInsideClick={false}>
          <button
            onClick={() => onServerSelect([])}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
              selectedServerNames.length === 0
                ? 'bg-info/10 font-medium text-info'
                : 'text-foreground'
            }`}
          >
            All Servers ({servers.length})
          </button>

          <div className="my-1 border-t border-border" />

          {servers.map((server) => (
            <ServerItem
              key={server.name}
              server={server}
              serverStatus={serverStatuses.find(s => s.name === server.name)}
              isSelected={selectedServerNames.includes(server.name)}
              onToggle={toggleServer}
            />
          ))}
        </DropdownMenu>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={reloading}
          className="rounded-lg border border-input p-2 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          title={refreshTooltip}
        >
          <RefreshCw className={`size-4 text-muted-foreground ${reloading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </Panel>
  )
}
