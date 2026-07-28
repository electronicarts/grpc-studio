// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { GrpcService, GrpcMethod } from '@/types/grpc'
import type { RequestMetadata } from '@grpc-studio/shared'
import { buildShareableUrl } from '@/utils/shareableLink'

// Context
import { MethodExplorerProvider, useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks/useMethodKind'

// Components
import MethodHeader from './MethodHeader'
import RequestInput from './RequestInput'
import BidirectionalPanel from './BidirectionalPanel'
import StreamingInfo from './StreamingInfo'
import ExecutionControls from './ExecutionControls'
import ErrorDisplay from './ErrorDisplay'
import ResponseDisplay from './ResponseDisplay'
import StreamingMessageDisplay from './StreamingMessageDisplay'
import ProtoViewer from './ProtoViewer'


interface MethodExplorerProps {
  tabId: string
  selectedTarget: string
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  initialRequestBody?: Record<string, unknown> | null
  initialMetadata?: RequestMetadata | null
}

// Inner component that uses context - memoized to prevent excessive re-renders
const MethodExplorerContent: React.FC = React.memo(() => {
  const {
    selectedTarget,
    selectedService,
    selectedMethod,
    request,
    stream,
    metadata,
    execution,
    history,
  } = useMethodExplorerContext()

  // Share current request as a link, carrying its custom metadata headers.
  const handleShare = (): string => {
    const sharedMetadata = metadata.toMetadata()
    try {
      const body = request.isFormMode
        ? request.formData
        : JSON.parse(request.body || '{}')
      return buildShareableUrl(selectedService.fullName, selectedMethod.name, body, sharedMetadata)
    } catch {
      return buildShareableUrl(selectedService.fullName, selectedMethod.name, {}, sharedMetadata)
    }
  }

  const { isBidirectional, isAnyStreaming } = useMethodKind()
  const showStreamPanel = isAnyStreaming && stream.sentMessages.length > 0

  return (
    <div className="px-8 py-6">
      <MethodHeader 
        selectedService={selectedService}
        selectedMethod={selectedMethod}
        onShare={handleShare}
      />

      <div className="space-y-8">
        {/* Request Input — always full width */}
        <RequestInput />

        {/* Streaming Info - hide once streaming has started */}
        {!showStreamPanel && <StreamingInfo selectedMethod={selectedMethod} />}

        {/* Execute Button / Streaming Controls */}
        <ExecutionControls />

        {/* Error Display */}
        <ErrorDisplay 
          error={execution.error}
          onDismiss={() => execution.setError(null)}
        />

        {/* Streaming panel: sent messages (left 35%) | responses (right 65%) — all streaming types.
            The min-w-0 wrappers stop each panel's content from overflowing its grid track and
            bleeding into the neighbouring column (grid items default to min-width:auto). Without
            them, a non-scrollable panel's wide content escapes its column and overlaps the other. */}
        {!history.visible && showStreamPanel && (
          <div className="grid grid-cols-[35%_65%] gap-4">
            <div className="min-w-0">
              <StreamingMessageDisplay
                label="Sent Messages"
                messages={stream.sentMessages}
                schema={request.schema}
                colorScheme="blue"
                scrollable={false}
                schemaNode={<ProtoViewer selectedTarget={selectedTarget} selectedService={selectedService} selectedMethod={selectedMethod} inline />}
              />
            </div>
            <div className="min-w-0">
              {isBidirectional ? <BidirectionalPanel /> : <ResponseDisplay />}
            </div>
          </div>
        )}

        {/* Unary response */}
        {!history.visible && !isAnyStreaming && <ResponseDisplay />}
      </div>
    </div>
  )
})

MethodExplorerContent.displayName = 'MethodExplorerContent'

// Main component with Provider wrapper
const MethodExplorer: React.FC<MethodExplorerProps> = ({ tabId, selectedTarget, selectedService, selectedMethod, initialRequestBody, initialMetadata }) => {
  // Empty state (before provider, for performance)
  if (!selectedMethod || !selectedService) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <img src="/logo.svg" alt="" className="mx-auto mb-4 size-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">Ready to Play</h3>
        <p className="text-sm">
          Select a service and method from the sidebar to start playing with your gRPC endpoints
        </p>
      </div>
    )
  }

  return (
    <MethodExplorerProvider
      tabId={tabId}
      selectedTarget={selectedTarget}
      selectedService={selectedService}
      selectedMethod={selectedMethod}
      initialRequestBody={initialRequestBody}
      initialMetadata={initialMetadata}
    >
      <MethodExplorerContent />
    </MethodExplorerProvider>
  )
}

export default MethodExplorer
