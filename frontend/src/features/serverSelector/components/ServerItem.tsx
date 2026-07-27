// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { statusIcons, statusConfigs } from '../../certificateValidator'
import { TONES } from '@/utils/tones'
import type { ServerItemProps } from '../types'

export function ServerItem({ server, serverStatus, isSelected, onToggle }: ServerItemProps) {
  const isConnected = serverStatus?.connected ?? false
  const serverCert = serverStatus?.certificate?.serverCert
  const clientCert = serverStatus?.certificate?.clientCert

  const ServerCertIcon = serverCert?.status ? statusIcons[serverCert.status] : null
  const serverCertColor = serverCert?.status ? TONES[statusConfigs[serverCert.status].tone].text : ''

  const ClientCertIcon = clientCert?.status ? statusIcons[clientCert.status] : null
  const clientCertColor = clientCert?.status ? TONES[statusConfigs[clientCert.status].tone].text : ''

  return (
    <label
      className={`flex w-full cursor-pointer items-center px-3 py-2 text-sm hover:bg-accent ${
        isSelected ? 'bg-info/10' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(server.name)}
        className="mr-3 size-4 rounded border-input text-info focus:ring-ring"
      />
      <div className="flex flex-1 items-center gap-2">
        <div className={`size-2 flex-shrink-0 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
        <span className="flex-1 truncate text-foreground">{server.name}</span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {ServerCertIcon && (
            <div title={`Server cert: ${serverCert?.daysRemaining}d`}>
              <ServerCertIcon className={`size-3.5 ${serverCertColor}`} />
            </div>
          )}
          {ClientCertIcon && (
            <div title={`Client cert: ${clientCert?.daysRemaining}d`}>
              <ClientCertIcon className={`size-3.5 ${clientCertColor}`} />
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{server.services.length}</span>
      </div>
    </label>
  )
}
