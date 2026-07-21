// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import ReceivedStreamingPanel from './ReceivedStreamingPanel'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks/useMethodKind'

const BidirectionalPanel: React.FC = () => {
  const { stream } = useMethodExplorerContext()
  const { isBidirectional } = useMethodKind()

  if (!isBidirectional || (!stream.active && !stream.completed && stream.messages.length === 0)) {
    return null
  }

  return <ReceivedStreamingPanel />
}

export default BidirectionalPanel
