// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ViewTabs, { type ViewTab } from './ViewTabs'
import ResponseActions from './ResponseActions'
import { ResponseMetadata } from './ResponseMetadata'
import ProtoViewer from './ProtoViewer'
import ProtoMessageRenderer from '../../schemaRenderer'
import { useMethodExplorerContext } from '../stores'

/**
 * Renders the single response from a completed unary RPC call.
 * No list chrome — just header (tabs, time, size, actions) and body content.
 */
const UnaryMessageDisplay: React.FC = () => {
  const { selectedTarget, selectedService, selectedMethod, response } = useMethodExplorerContext()
  const hasSchema = !!(response.data && response.schema)
  const [activeTab, setActiveTab] = useState<ViewTab>(hasSchema ? 'form' : 'json')
  const effectiveTab = activeTab === 'form' && !hasSchema ? 'json' : activeTab
  const [expanded, setExpanded] = useState(true)
  const prevHasSchemaRef = useRef(hasSchema)

  // Switch to form view when schema first loads (only when schema transitions from false to true)
  useEffect(() => {
    if (hasSchema && !prevHasSchemaRef.current && activeTab === 'json') {
      setActiveTab('form')
    }
    prevHasSchemaRef.current = hasSchema
  }, [hasSchema, activeTab])

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Response</label>
          <ResponseMetadata time={response.time} size={response.size} />
        </div>
        <div className="flex items-center gap-2">
          <ViewTabs
            activeTab={effectiveTab}
            hasSchema={hasSchema}
            onTabChange={setActiveTab}
            showSchemaTab
          />
          <ResponseActions raw={response.raw} serviceName={selectedService?.name} methodName={selectedMethod?.name} />
        </div>
      </div>

      {/* Body */}
      {effectiveTab === 'schema' ? (
        <ProtoViewer selectedTarget={selectedTarget} selectedService={selectedService} selectedMethod={selectedMethod} inline outputOnly />
      ) : effectiveTab === 'form' && hasSchema ? (
        <div className="rounded-md border bg-muted/50 p-4">
          <ProtoMessageRenderer
            target={selectedTarget}
            schema={response.schema}
            data={response.data as Record<string, unknown>}
            onChange={() => {}}
            readOnly
            defaultCollapsed
            hideEmptyFields
          />
        </div>
      ) : (
        <div className="rounded-md border bg-muted/50">
          <div className="flex justify-end px-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)} className="h-7 px-2 text-xs">
              {expanded ? <><ChevronUp className="mr-1 size-3" />Collapse</> : <><ChevronDown className="mr-1 size-3" />Expand</>}
            </Button>
          </div>
          <pre className={`overflow-auto px-4 pb-4 text-sm ${expanded ? '' : 'max-h-60'}`}>
            {response.raw}
          </pre>
        </div>
      )}
    </div>
  )
}

export default UnaryMessageDisplay
