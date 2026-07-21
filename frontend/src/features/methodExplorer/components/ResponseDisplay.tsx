// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import UnaryMessageDisplay from './UnaryMessageDisplay'
import ReceivedStreamingPanel from './ReceivedStreamingPanel'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks/useMethodKind'

/**
 * Routes to the appropriate response display based on the selected method type:
 * - Bidirectional streaming: renders nothing (BidirectionalPanel owns the received panel)
 * - Non-bidi streaming: renders StreamingMessageDisplay (streaming message list)
 * - Unary: renders UnaryMessageDisplay (single response panel)
 */
const ResponseDisplay: React.FC = () => {
  const { response, stream } = useMethodExplorerContext()
  const { isBidirectional, isAnyStreaming } = useMethodKind()
  const isNonBidiStreaming = isAnyStreaming && !isBidirectional
  const hasStreamingResponse = stream.active || stream.completed || stream.messages.length > 0

  if (isBidirectional && hasStreamingResponse) return null

  if (isNonBidiStreaming && hasStreamingResponse) {
    return <ReceivedStreamingPanel />
  }

  if (!response.raw) return null

  return <UnaryMessageDisplay />
}

export default ResponseDisplay
