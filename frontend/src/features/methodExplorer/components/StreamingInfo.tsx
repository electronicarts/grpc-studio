// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { GrpcMethod } from '../../../types/grpc'
import { useMethodKind } from '../hooks'
import { MethodKind } from '@grpc-studio/shared'

interface StreamingInfoProps {
  selectedMethod: GrpcMethod
}

const StreamingInfo: React.FC<StreamingInfoProps> = ({ selectedMethod }) => {
  const { isBidirectional, isClientOnly, isServerOnly } = useMethodKind()

  if (selectedMethod.kind === MethodKind.UNARY) return null

  return (
    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
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
