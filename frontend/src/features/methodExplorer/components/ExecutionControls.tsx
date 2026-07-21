// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Play } from 'lucide-react'
import ServerStreamControls from './ServerStreamControls'
import ClientStreamControls from './ClientStreamControls'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks/useMethodKind'

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
          className="h-8 bg-gradient-to-r from-info to-brand px-6 text-white hover:from-info/90 hover:to-brand/90"
        >
          {execution.loading ? (
            <>
              <Spinner size={3} tone="onAccent" className="mr-2" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 size-3" />
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
