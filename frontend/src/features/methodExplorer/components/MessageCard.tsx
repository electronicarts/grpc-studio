// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import ProtoMessageRenderer from '../../schemaRenderer'
import type { DescMessage } from '@bufbuild/protobuf'
import { getMessagePreview } from '../utils/messagePreview'
import { useCopyToClipboard } from '../../../utils/useCopyToClipboard'

interface MessageCardProps {
  msg: unknown
  originalIndex: number
  isExpanded: boolean
  isLatest: boolean
  schema?: DescMessage | null
  isFormMode: boolean
  onToggle: () => void
  colorScheme?: 'purple' | 'blue'
}

const MessageCard: React.FC<MessageCardProps> = ({
  msg, originalIndex, isExpanded, isLatest,
  schema, isFormMode, onToggle, colorScheme = 'purple',
}) => {
  const { copied, copy } = useCopyToClipboard()

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copy(JSON.stringify(msg, null, 2))
  }

  const accent = colorScheme === 'blue'
    ? {
        border: 'border-l-blue-500 dark:border-l-blue-400',
        badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
        number: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      }
    : {
        border: 'border-l-purple-500 dark:border-l-purple-400',
        badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
        number: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      }

  return (
  <Card 
    className={`border-l-4 hover:shadow-md transition-shadow ${
      isLatest 
        ? 'border-l-green-500 dark:border-l-green-400 bg-green-50/30 dark:bg-green-950/20' 
        : accent.border
    }`}
  >
    <CardContent className="p-0">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
            isLatest 
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : accent.number
          }`}>
            {originalIndex}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                #{originalIndex}
              </span>
              {isLatest && (
                <span className="px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded font-medium">
                  LATEST
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
              {getMessagePreview(msg)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
          {isFormMode && schema ? (
            <div className="mt-2">
              <ProtoMessageRenderer
                schema={schema}
                data={msg as Record<string, unknown>}
                onChange={() => {}}
                readOnly={true}
                defaultCollapsed={false}
                showControls={true}
                hideEmptyFields={true}
              />
            </div>
          ) : (
            <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-auto max-h-80 font-mono text-gray-800 dark:text-gray-200">
              {JSON.stringify(msg, null, 2)}
            </pre>
          )}
        </div>
      )}
    </CardContent>
  </Card>
  )
}

export default MessageCard
