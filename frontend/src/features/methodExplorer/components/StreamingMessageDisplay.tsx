// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import ViewTabs, { type ViewTab } from './ViewTabs'
import MessageList from './MessageList'
import ResponseActions from './ResponseActions'
import { ResponseMetadata } from './ResponseMetadata'
import type { DescMessage } from '@bufbuild/protobuf'

interface StreamingMessageDisplayProps {
  label: string
  messages: unknown[]
  schema: DescMessage | null
  colorScheme?: 'blue' | 'purple'
  /** When provided, shows a Live/Ended status badge */
  active?: boolean
  /** Optional metadata badges (time, size) */
  time?: number | null
  size?: number | null
  /** When provided, shows copy/download actions */
  raw?: string
  serviceName?: string
  methodName?: string
  /** Node to render when the Schema tab is active. If omitted, the Schema tab is hidden. */
  schemaNode?: React.ReactNode
}

const countBadgeClass = {
  blue: 'bg-info/10 text-info',
  purple: 'bg-brand/10 text-brand',
}

const StreamingMessageDisplay: React.FC<StreamingMessageDisplayProps> = ({
  label,
  messages,
  schema,
  colorScheme = 'blue',
  active,
  time,
  size,
  raw,
  serviceName,
  methodName,
  schemaNode,
}) => {
  const [tab, setTab] = useState<ViewTab>(schema ? 'form' : 'json')
  const effectiveTab = tab === 'form' && !schema ? 'json' : tab
  const showStatusBadge = active !== undefined
  const prevSchemaRef = useRef(schema)

  // Switch to form view when schema first loads (only when schema transitions from null to value)
  useEffect(() => {
    if (schema && !prevSchemaRef.current && tab === 'json') {
      setTab('form')
    }
    prevSchemaRef.current = schema
  }, [schema, tab])

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 border-b border-border pb-1">
        {/* Row 1: label + status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>

          {showStatusBadge && (active ? (
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <Loader2 className="size-3 animate-spin" />
              Live
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Ended
            </span>
          ))}

          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${countBadgeClass[colorScheme]}`}>
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            newest first
          </span>

          <ResponseMetadata time={time} size={size} />
        </div>
        {/* Row 2: view tabs + actions */}
        <div className="flex items-center justify-end gap-2">
          <ViewTabs activeTab={effectiveTab} onTabChange={setTab} showSchemaTab={!!schemaNode} showMetadataTab={false} />
          {raw && (
            <ResponseActions raw={raw} serviceName={serviceName} methodName={methodName} />
          )}
        </div>
      </div>

      {effectiveTab === 'schema' && schemaNode ? (
        schemaNode
      ) : messages.length > 0 ? (
        <MessageList
          messages={messages}
          schema={effectiveTab === 'form' ? schema : null}
          isFormMode={effectiveTab === 'form'}
          colorScheme={colorScheme}
          showExpandAll={messages.length > 1}
          resizable
          storageKey="grpc-studio-stream-messages-height"
        />
      ) : showStatusBadge ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          {active ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Waiting for messages...
            </>
          ) : (
            'Stream ended with no messages.'
          )}
        </div>
      ) : null}
    </div>
  )
}

export default StreamingMessageDisplay
