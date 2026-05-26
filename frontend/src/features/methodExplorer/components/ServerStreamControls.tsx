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
  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md">
    <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
    <div className="flex-1">
      <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
        Streaming in progress...
      </div>
      <div className="text-xs text-purple-600 dark:text-purple-400">
        {stream.messages.length} message{stream.messages.length !== 1 ? 's' : ''} received
      </div>
    </div>
    <Button
      onClick={execution.cancelStream}
      variant="outline"
      className="h-8 px-4 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
    >
      <StopCircle className="w-3 h-3 mr-2" />
      Cancel
    </Button>
  </div>
)

export default ServerStreamControls
