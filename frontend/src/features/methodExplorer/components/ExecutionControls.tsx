// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import ServerStreamControls from './ServerStreamControls'
import ClientStreamControls from './ClientStreamControls'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks'

const ExecutionControls: React.FC = () => {
  const { execution, stream, history } = useMethodExplorerContext()
  const { isServerOnly, isClientStreaming } = useMethodKind()

  if (history.visible) return null

  if (stream.active && isServerOnly) {
    return <ServerStreamControls execution={execution} stream={stream} />
  }

  if (stream.active && isClientStreaming) {
    return <ClientStreamControls execution={execution} />
  }

  if (!stream.active) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={execution.invoke}
          disabled={execution.loading}
          className="h-8 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          {execution.loading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-2" />
              Execute Method
            </>
          )}
        </Button>
      </div>
    )
  }

  return null
}

export default ExecutionControls
