// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { GrpcMethod } from '../../../types/grpc'
import { useMethodKind } from '../hooks/useMethodKind'
import { MethodKind } from '@grpc-studio/shared'

interface StreamingInfoProps {
  selectedMethod: GrpcMethod
}

const StreamingInfo: React.FC<StreamingInfoProps> = ({ selectedMethod }) => {
  const { isBidirectional, isClientOnly, isServerOnly } = useMethodKind()

  if (selectedMethod.kind === MethodKind.UNARY) return null

  return (
    <div className="mt-2 rounded-md border border-info/30 bg-info/10 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-info" />
        <div className="text-sm text-info">
          {isBidirectional && (
            <span>
              <strong>Bidirectional Streaming:</strong> Send your first message to start, 
              then use "Send Message" to send more data and "End Stream" when done. 
              You'll receive responses in real-time.
            </span>
          )}
          {isClientOnly && (
            <span>
              <strong>Client Streaming:</strong> Send your first message to start, 
              then use "Send Message" to send more data and "End Stream" when done 
              to receive the final response.
            </span>
          )}
          {isServerOnly && (
            <span>
              <strong>Server Streaming:</strong> Send one request and receive 
              multiple responses in real-time.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreamingInfo
