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
      className="h-8 bg-info px-6 text-white hover:bg-info/90"
    >
      <Send className="mr-2 size-3" />
      Send Message
    </Button>
    <Button
      onClick={execution.endStream}
      variant="outline"
      className="h-8 px-6"
    >
      <StopCircle className="mr-2 size-3" />
      End Stream
    </Button>
    <Button
      onClick={execution.cancelStream}
      variant="destructive"
      className="h-8 px-6"
    >
      <XCircle className="mr-2 size-3" />
      Cancel
    </Button>
  </div>
)

export default ClientStreamControls
