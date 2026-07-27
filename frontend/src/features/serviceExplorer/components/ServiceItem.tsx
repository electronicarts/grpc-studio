// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ChevronRight, Layers } from 'lucide-react'
import type { ServiceItemProps } from '../types'

const ServiceItem: React.FC<ServiceItemProps & { serverName?: string; serverTarget?: string }> = ({ service, isSelected, isExpanded, onToggle, children, serverName, serverTarget }) => {
  const displayName = service.name ?? service.fullName.split('.').pop() ?? service.fullName

  return (
    <div>
      <button
        className={`w-full rounded-lg px-3 py-2 text-left transition-all duration-200 ${
          isSelected
            ? 'border-2 border-info/30 bg-info/10'
            : 'border-2 border-transparent hover:bg-muted/50'
        }`}
        onClick={() => onToggle(service)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center space-x-2.5">
            <Layers className={`size-3.5 flex-shrink-0 ${
              isSelected ? 'text-info' : 'text-muted-foreground'
            }`} />
            <div className="min-w-0">
              <h3 className={`break-words text-sm font-medium ${
                isSelected ? 'text-info' : 'text-foreground/90'
              }`}>{displayName}</h3>
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <div>Methods: {service.methods.length}</div>
                {serverName && <div className="break-words">Server: {serverName}</div>}
                {serverTarget && <div className="break-all">Endpoint: {serverTarget}</div>}
              </div>
            </div>
          </div>
          <ChevronRight className={`size-4 flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          } text-muted-foreground`} />
        </div>
      </button>

      {isExpanded && children && (
        <div className="animate-in slide-in-from-top-2 ml-6 mt-3 space-y-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

export default ServiceItem
