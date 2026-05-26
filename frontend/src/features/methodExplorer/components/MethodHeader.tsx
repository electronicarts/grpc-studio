// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Forward, Check } from 'lucide-react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { useCopyToClipboard } from '../../../utils/useCopyToClipboard'
import { useMethodKind } from '../hooks'
import { MethodKind } from '@grpc-studio/shared'

interface MethodHeaderProps {
  selectedService: GrpcService
  selectedMethod: GrpcMethod
  onShare?: () => string
}

const MethodHeader: React.FC<MethodHeaderProps> = ({ selectedService, selectedMethod, onShare }) => {
  const { copied, copy } = useCopyToClipboard()
  const { isBidirectional, isServerStreaming, isClientStreaming } = useMethodKind()

  const handleShare = () => {
    const url = onShare?.()
    if (url) copy(url)
  }
  const getMethodTypeBadge = () => {
    if (isBidirectional) return 'Bidirectional'
    if (isServerStreaming) return 'Server Streaming'
    if (isClientStreaming) return 'Client Streaming'
    return 'Unary'
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="" className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedMethod.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {selectedService.fullName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            title="Copy shareable link"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Forward className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            selectedMethod.kind !== MethodKind.UNARY
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          }`}>
            {getMethodTypeBadge()}
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {selectedMethod.inputType} → {selectedMethod.outputType}
      </div>
    </div>
  )
}

export default MethodHeader
