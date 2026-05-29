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
  blue: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  purple: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
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
      <div className="space-y-1.5 pb-1 border-b border-gray-200 dark:border-gray-700">
        {/* Row 1: label + status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>

          {showStatusBadge && (active ? (
            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full flex items-center gap-1 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
              Ended
            </span>
          ))}

          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${countBadgeClass[colorScheme]}`}>
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
            newest first
          </span>

          <ResponseMetadata time={time} size={size} />
        </div>
        {/* Row 2: view tabs + actions */}
        <div className="flex items-center gap-2 justify-end">
          <ViewTabs activeTab={effectiveTab} onTabChange={setTab} showSchemaTab={!!schemaNode} />
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
          maxHeight="max-h-80"
          showExpandAll={messages.length > 1}
        />
      ) : showStatusBadge ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          {active ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
