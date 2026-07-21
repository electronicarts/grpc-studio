// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Forward, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { useCopyToClipboard } from '../../../utils/useCopyToClipboard'
import { useMethodKind } from '../hooks/useMethodKind'
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
    <div className="mb-8 border-b border-border pb-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center space-x-4">
          <img src="/logo.svg" alt="" className="size-12 flex-shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold text-foreground">
              {selectedMethod.name}
            </h1>
            <p className="mt-1 break-all text-muted-foreground">
              {selectedService.fullName}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center space-x-3">
          <button
            onClick={handleShare}
            title="Copy shareable link"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-info/10 hover:text-info"
          >
            {copied ? <Check className="size-4 text-success" /> : <Forward className="size-4" />}
            {copied ? 'Copied!' : 'Share'}
          </button>
          <Badge
            variant={selectedMethod.kind !== MethodKind.UNARY ? 'critical' : 'success'}
            className="px-4 py-2 text-sm"
          >
            {getMethodTypeBadge()}
          </Badge>
        </div>
      </div>
      <div className="break-all text-sm text-muted-foreground">
        {selectedMethod.inputType} → {selectedMethod.outputType}
      </div>
    </div>
  )
}

export default MethodHeader
