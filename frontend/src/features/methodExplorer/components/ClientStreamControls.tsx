// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Send, StopCircle, XCircle } from 'lucide-react'
import type { MethodInvocation } from '../types'

interface ClientStreamControlsProps {
  execution: MethodInvocation
}

const ClientStreamControls: React.FC<ClientStreamControlsProps> = ({ execution }) => (
  <div className="flex gap-2">
    <Button
      onClick={execution.sendMessage}
      className="h-8 px-6 bg-blue-600 hover:bg-blue-700 text-white"
    >
      <Send className="w-3 h-3 mr-2" />
      Send Message
    </Button>
    <Button
      onClick={execution.endStream}
      variant="outline"
      className="h-8 px-6"
    >
      <StopCircle className="w-3 h-3 mr-2" />
      End Stream
    </Button>
    <Button
      onClick={execution.cancelStream}
      variant="destructive"
      className="h-8 px-6"
    >
      <XCircle className="w-3 h-3 mr-2" />
      Cancel
    </Button>
  </div>
)

export default ClientStreamControls
