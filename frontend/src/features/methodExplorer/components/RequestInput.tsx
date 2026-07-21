// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState } from 'react'
import { Loader2, History, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProtoMessageRenderer from '../../schemaRenderer'
import ProtoViewer from './ProtoViewer'
import HistoryPanel from './HistoryPanel'
import ViewTabs, { type ViewTab } from './ViewTabs'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks/useMethodKind'

const RequestInput: React.FC = () => {
  const { selectedTarget, selectedService, selectedMethod, request, response, stream, execution, history, toggleHistory, loadFromHistory } = useMethodExplorerContext()
  const [activeTab, setActiveTab] = useState<ViewTab>(request.isFormMode ? 'form' : 'json')

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab)
    if (tab === 'form' && !request.isFormMode) {
      request.toggleMode(true)
    } else if (tab === 'json' && request.isFormMode) {
      request.toggleMode(false)
    }
  }

  const hasStreamMessages = stream.messages.length > 0
  const streamCompleted = !stream.active && hasStreamMessages

  const handleHistory = () => {
    if (streamCompleted) stream.reset()
    toggleHistory()
  }

  const handleReset = () => {
    if (streamCompleted) stream.reset()
    request.reset()
    response.clear()
    execution.setError(null)
    history.setVisible(false)
  }

  const { isBidirectional } = useMethodKind()
  const bidiStreaming = isBidirectional && stream.active

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm font-medium">{bidiStreaming ? 'Send Messages' : 'Request Input'}</label>
        <div className="flex items-center gap-2">
          {history.visible ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-3"
              onClick={() => history.setVisible(false)}
            >
              <ArrowLeft className="mr-1 size-3" />
              Back
            </Button>
          ) : (
            <>
              <ViewTabs activeTab={activeTab} onTabChange={handleTabChange} />
              {!stream.active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={handleHistory}
                  disabled={history.items.length === 0}
                >
                  <History className="mr-1 size-3" />
                  History {history.items.length > 0 && `(${history.items.length})`}
                </Button>
              )}
              {!stream.active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-3"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-1 size-3" />
                  Reset
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!history.visible && (
        <>
          {activeTab === 'form' && (
            <div className="rounded-md border bg-muted/50 p-6">
              {request.loadingSchema ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-3 size-6 animate-spin" />
                  <span>Loading schema...</span>
                </div>
              ) : (
                <ProtoMessageRenderer
                  target={selectedTarget}
                  key={`${selectedService?.fullName}-${selectedMethod.name}-${request.formKey}`}
                  schema={request.schema}
                  data={request.formData}
                  onChange={request.setFormData}
                />
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <textarea
              value={request.body}
              onChange={(e) => request.setBody(e.target.value)}
              className="h-40 w-full rounded-md border bg-background p-4 font-mono text-sm"
              placeholder="Enter your gRPC request as JSON..."
            />
          )}

          {request.validationError && (
            <p className="mt-2 text-sm text-destructive">{request.validationError}</p>
          )}

          {activeTab === 'schema' && (
            <ProtoViewer
              selectedTarget={selectedTarget}
              selectedService={selectedService}
              selectedMethod={selectedMethod}
              inline
            />
          )}
        </>
      )}

      {history.visible && (
        <HistoryPanel
          historyItems={history.items}
          onLoadHistory={loadFromHistory}
          onDeleteItem={history.remove}
          onClearAll={history.clearAll}
        />
      )}
    </div>
  )
}

export default RequestInput
