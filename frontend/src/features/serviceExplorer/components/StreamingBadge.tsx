// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { StreamingType } from '../types'

interface StreamingBadgeProps {
  type: StreamingType
}

const StreamingBadge: React.FC<StreamingBadgeProps> = ({ type }) => {
  const isStreaming = type !== 'Unary'

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${
      isStreaming
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    }`}>
      {type}
    </span>
  )
}

export default StreamingBadge
