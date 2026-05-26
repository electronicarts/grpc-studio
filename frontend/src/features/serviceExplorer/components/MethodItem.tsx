// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import StreamingBadge from './StreamingBadge'
import { getStreamingType } from '../utils/streamingType'
import type { MethodItemProps } from '../types'

const MethodItem: React.FC<MethodItemProps> = ({ method, service, isSelected, onSelect }) => {
  return (
    <button
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
        isSelected
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
      onClick={() => onSelect(method, service)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img src="/logo.svg" alt="" className="h-3 w-3" />
          <span className="font-medium">{method.name}</span>
        </div>
        <StreamingBadge type={getStreamingType(method)} />
      </div>
    </button>
  )
}

export default MethodItem
