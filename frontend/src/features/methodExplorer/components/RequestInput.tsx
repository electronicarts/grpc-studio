// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState } from 'react'
import { Loader2, History, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProtoMessageRenderer from '../../schemaRenderer'
import ProtoViewer from './ProtoViewer'
import HistoryPanel from './HistoryPanel'
import ViewTabs, { type ViewTab } from './ViewTabs'
import { useMethodExplorerContext } from '../stores'
import { useMethodKind } from '../hooks'

const RequestInput: React.FC = () => {
  const { selectedService, selectedMethod, request, response, stream, execution, history, toggleHistory, loadFromHistory } = useMethodExplorerContext()
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
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium">{bidiStreaming ? 'Send Messages' : 'Request Input'}</label>
        <div className="flex items-center gap-2">
          {history.visible ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 rounded-full"
              onClick={() => history.setVisible(false)}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          ) : (
            <>
              <ViewTabs activeTab={activeTab} onTabChange={handleTabChange} />
              {!stream.active && history.items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 rounded-full"
                  onClick={handleHistory}
                >
                  <History className="w-3 h-3 mr-1" />
                  History ({history.items.length})
                </Button>
              )}
              {!stream.active && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 rounded-full"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
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
            <div className="border rounded-md p-6 bg-muted/50">
              {request.loadingSchema ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  <span>Loading schema...</span>
                </div>
              ) : (
                <ProtoMessageRenderer
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
              className="w-full h-40 p-4 border rounded-md font-mono text-sm bg-background"
              placeholder="Enter your gRPC request as JSON..."
            />
          )}

          {request.validationError && (
            <p className="mt-2 text-sm text-destructive">{request.validationError}</p>
          )}

          {activeTab === 'schema' && (
            <ProtoViewer
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
