// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, StopCircle } from 'lucide-react'
import type { MethodInvocation, StreamModel } from '../types'

interface ServerStreamControlsProps {
  execution: MethodInvocation
  stream: StreamModel
}

const ServerStreamControls: React.FC<ServerStreamControlsProps> = ({ execution, stream }) => (
  <div className="flex items-center gap-3 rounded-md border border-brand/30 bg-brand/10 p-3">
    <Loader2 className="size-5 animate-spin text-brand" />
    <div className="flex-1">
      <div className="text-sm font-medium text-brand">
        Streaming in progress...
      </div>
      <div className="text-xs text-brand">
        {stream.messages.length} message{stream.messages.length !== 1 ? 's' : ''} received
      </div>
    </div>
    <Button
      onClick={execution.cancelStream}
      variant="outline"
      className="h-8 border-danger/30 px-4 text-danger hover:bg-danger/10"
    >
      <StopCircle className="mr-2 size-3" />
      Cancel
    </Button>
  </div>
)

export default ServerStreamControls
