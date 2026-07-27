// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import ProtoMessageRenderer from '../../schemaRenderer'
import type { DescMessage } from '@bufbuild/protobuf'
import { getMessagePreview } from '../utils/messagePreview'
import { useCopyToClipboard } from '../../../utils/useCopyToClipboard'
import { useMethodExplorerContext } from '../stores'

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
  const { selectedTarget } = useMethodExplorerContext()
  const { copied, copy } = useCopyToClipboard()

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copy(JSON.stringify(msg, null, 2))
  }

  const accent = colorScheme === 'blue'
    ? {
        border: 'border-l-info',
        number: 'bg-info/10 text-info',
      }
    : {
        border: 'border-l-brand',
        number: 'bg-brand/10 text-brand',
      }

  return (
  <Card
    className={`border-l-4 transition-shadow hover:shadow-md ${
      isLatest
        ? 'border-l-success bg-success/5'
        : accent.border
    }`}
  >
    <CardContent className="p-0">
      <div 
        className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`flex size-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isLatest 
              ? 'bg-success/10 text-success'
              : accent.number
          }`}>
            {originalIndex}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                #{originalIndex}
              </span>
              {isLatest && (
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  LATEST
                </span>
              )}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
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
            {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          </Button>
          {isExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border px-3 pb-3">
          {isFormMode && schema ? (
            <div className="mt-2">
              <ProtoMessageRenderer
                target={selectedTarget}
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
            <pre className="mt-2 max-h-80 overflow-auto rounded bg-muted p-3 font-mono text-xs text-foreground">
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
