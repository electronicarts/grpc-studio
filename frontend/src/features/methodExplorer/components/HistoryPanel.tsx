// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Trash2, CheckCircle2, XCircle, Timer, HardDrive } from 'lucide-react'
import { RequestHistoryItem } from '../types'
import { getValuePreview } from '../utils/messagePreview'
import { formatBytes, formatDateTime } from '../../../utils/dateFormatters'

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
    <div className="mb-4 border rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Request History
        </h4>
        {historyItems.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
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
              className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-blue-400 dark:hover:border-blue-600 transition-colors group cursor-pointer"
              onClick={() => onLoadHistory(item)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(item.timestamp)}
                  </span>
                  {item.responseStatus && (
                    item.responseStatus.ok ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full max-w-[200px] truncate"
                        title={item.responseStatus.message}
                      >
                        <XCircle className="w-3 h-3 flex-shrink-0" />
                        {item.responseStatus.code ?? 'Error'}
                      </span>
                    )
                  )}
                  {item.responseStatus?.responseTimeMs != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Timer className="w-3 h-3" />
                      {item.responseStatus.responseTimeMs}ms
                    </span>
                  )}
                  {item.responseStatus?.responseSizeBytes != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <HardDrive className="w-3 h-3" />
                      {formatBytes(item.responseStatus.responseSizeBytes)}
                    </span>
                  )}
                </div>
                {item.label && (
                  <div className="text-sm font-medium mb-1">{item.label}</div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {preview}
                </div>
                {dataKeys.length > 4 && (
                  <div className="text-xs text-gray-400 mt-1">
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
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HistoryPanel
