// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { StreamingType } from '../types'

interface StreamingBadgeProps {
  type: StreamingType
}

const StreamingBadge: React.FC<StreamingBadgeProps> = ({ type }) => {
  const isStreaming = type !== 'Unary'

  return (
    <Badge variant={isStreaming ? 'critical' : 'success'} className="px-2 py-1 text-xs font-normal">
      {type}
    </Badge>
  )
}

export default StreamingBadge
