// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import type { GrpcService, GrpcMethod } from '@/types/grpc'
import { buildShareableUrl } from '@/utils/shareableLink'

// Context
import { MethodExplorerProvider, useMethodExplorerContext } from './stores'
import { useMethodKind } from './hooks'

// Components
import MethodHeader from './components/MethodHeader'
import RequestInput from './components/RequestInput'
import BidirectionalPanel from './components/BidirectionalPanel'
import StreamingInfo from './components/StreamingInfo'
import ExecutionControls from './components/ExecutionControls'
import ErrorDisplay from './components/ErrorDisplay'
import ResponseDisplay from './components/ResponseDisplay'
import StreamingMessageDisplay from './components/StreamingMessageDisplay'
import ProtoViewer from './components/ProtoViewer'


interface MethodExplorerProps {
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  initialRequestBody?: Record<string, unknown> | null
}

// Inner component that uses context - memoized to prevent excessive re-renders
const MethodExplorerContent: React.FC = React.memo(() => {
  const {
    selectedService,
    selectedMethod,
    request,
    stream,
    execution,
    history,
  } = useMethodExplorerContext()

  // Share current request as a link
  const handleShare = (): string => {
    try {
      const body = request.isFormMode
        ? request.formData
        : JSON.parse(request.body || '{}')
      return buildShareableUrl(selectedService.fullName, selectedMethod.name, body)
    } catch {
      return buildShareableUrl(selectedService.fullName, selectedMethod.name, {})
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

        {/* Streaming panel: sent messages (left 30%) | responses (right 70%) — all streaming types */}
        {!history.visible && showStreamPanel && (
          <div className="grid grid-cols-[30%_70%] gap-4">
            <StreamingMessageDisplay
              label="Sent Messages"
              messages={stream.sentMessages}
              schema={request.schema}
              colorScheme="blue"
              schemaNode={<ProtoViewer selectedService={selectedService} selectedMethod={selectedMethod} inline />}
            />
            {isBidirectional ? <BidirectionalPanel /> : <ResponseDisplay />}
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
const MethodExplorer: React.FC<MethodExplorerProps> = ({ selectedService, selectedMethod, initialRequestBody }) => {
  // Empty state (before provider, for performance)
  if (!selectedMethod || !selectedService) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <img src="/logo.svg" alt="" className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Ready to Play</h3>
        <p className="text-sm">
          Select a service and method from the sidebar to start playing with your gRPC endpoints
        </p>
      </div>
    )
  }

  return (
    <MethodExplorerProvider
      selectedService={selectedService}
      selectedMethod={selectedMethod}
      initialRequestBody={initialRequestBody}
    >
      <MethodExplorerContent />
    </MethodExplorerProvider>
  )
}

export default MethodExplorer

// Re-export context for external use
export { MethodExplorerProvider, useMethodExplorerContext } from './stores'

// Re-export components for direct use if needed
export { default as HistoryPanel } from './components/HistoryPanel'
export { default as MethodHeader } from './components/MethodHeader'
export { default as RequestInput } from './components/RequestInput'
export { default as ResponseDisplay } from './components/ResponseDisplay'
export { default as ExecutionControls } from './components/ExecutionControls'
export { default as StreamingInfo } from './components/StreamingInfo'
export { default as ErrorDisplay } from './components/ErrorDisplay'
export { default as BidirectionalPanel } from './components/BidirectionalPanel'
