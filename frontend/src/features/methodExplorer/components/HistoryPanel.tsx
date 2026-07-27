// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Trash2, CheckCircle2, XCircle, Timer, HardDrive } from 'lucide-react'
import { RequestHistoryItem } from '../types'
import { getValuePreview } from '../utils/messagePreview'
import { formatBytes } from '../../../utils/bytesUtils'
import { formatDateTime } from '../../../utils/dateFormatters'

interface HistoryPanelProps {
  historyItems: RequestHistoryItem[]
  onLoadHistory: (item: RequestHistoryItem) => void
  onDeleteItem: (itemId: string) => void
  onClearAll: () => void
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  historyItems,
  onLoadHistory,
  onDeleteItem,
  onClearAll
}) => {
  if (historyItems.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border bg-muted p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4" />
          Request History
        </h4>
        {historyItems.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs text-danger hover:bg-danger/10 hover:text-danger"
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {historyItems.map((item) => {
          const data = item.formData || (typeof item.requestBody === 'string' ? JSON.parse(item.requestBody || '{}') : item.requestBody)
          const dataKeys = Object.keys(data || {})
          const preview = dataKeys.length > 0 
            ? dataKeys.slice(0, 4).map(key => {
                const value = data[key]
                const valueStr = getValuePreview(value)
                return `${key}: ${valueStr}`
              }).join(', ')
            : 'Empty request'
          
          return (
            <div
              key={item.id}
              className="group flex cursor-pointer items-center gap-2 rounded border border-border bg-card p-3 transition-colors hover:border-info"
              onClick={() => onLoadHistory(item)}
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.timestamp)}
                  </span>
                  {item.responseStatus && (
                    item.responseStatus.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 className="size-3" />
                        OK
                      </span>
                    ) : (
                      <span
                        className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger"
                        title={item.responseStatus.message}
                      >
                        <XCircle className="size-3 flex-shrink-0" />
                        {item.responseStatus.code ?? 'Error'}
                      </span>
                    )
                  )}
                  {item.responseStatus?.responseTimeMs != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3" />
                      {item.responseStatus.responseTimeMs}ms
                    </span>
                  )}
                  {item.responseStatus?.responseSizeBytes != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <HardDrive className="size-3" />
                      {formatBytes(item.responseStatus.responseSizeBytes)}
                    </span>
                  )}
                </div>
                {item.label && (
                  <div className="mb-1 text-sm font-medium">{item.label}</div>
                )}
                <div className="font-mono text-xs text-muted-foreground">
                  {preview}
                </div>
                {dataKeys.length > 4 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    +{dataKeys.length - 4} more fields
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem(item.id)
                }}
                className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-danger" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HistoryPanel
