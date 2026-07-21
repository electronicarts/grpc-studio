// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import StreamingBadge from './StreamingBadge'
import { getStreamingType } from '../utils/streamingType'
import type { MethodItemProps } from '../types'

const MethodItem: React.FC<MethodItemProps> = ({ method, service, server, isSelected, onSelect }) => {
  return (
    <button
      className={`w-full rounded-lg p-3 text-left transition-all duration-200 ${
        isSelected
          ? 'bg-info text-white shadow-lg shadow-info/25'
          : 'text-foreground/90 hover:bg-accent'
      }`}
      onClick={() => onSelect(method, service, server)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start space-x-2">
          <img src="/logo.svg" alt="" className="mt-0.5 size-3 flex-shrink-0" />
          <span className="min-w-0 break-words font-medium">{method.name}</span>
        </div>
        <div className="flex-shrink-0">
          <StreamingBadge type={getStreamingType(method)} />
        </div>
      </div>
    </button>
  )
}

export default MethodItem
