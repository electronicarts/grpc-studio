// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import MessageCard from './MessageCard'
import type { DescMessage } from '@bufbuild/protobuf'
import { usePersistentHeight } from '@/hooks/usePersistentHeight'

interface MessageListProps {
  messages: unknown[]
  schema?: DescMessage | null
  isFormMode?: boolean
  colorScheme?: 'purple' | 'blue'
  maxHeight?: string
  showExpandAll?: boolean
  /**
   * When set, the scroll area opens at a generous default height and the user can
   * drag its bottom edge to any height (native vertical resize) instead of being
   * capped at a fixed `maxHeight`.
   */
  resizable?: boolean
  /**
   * localStorage key under which the user's dragged height is remembered and
   * restored across sessions. Only used when `resizable` is set.
   */
  storageKey?: string
}

/**
 * Shared scrollable list of collapsible streaming messages.
 * Manages expand/collapse state and auto-expands the latest message
 * whenever a new one arrives.
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  schema = null,
  isFormMode = false,
  colorScheme = 'purple',
  maxHeight = 'max-h-[600px]',
  showExpandAll = false,
  resizable = false,
  storageKey = 'grpc-studio-message-list-height',
}) => {
  const { ref: resizeRef, style: resizeStyle } = usePersistentHeight(storageKey, '32rem')
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set([0]))
  const [expandAll, setExpandAll] = useState(false)
  const prevCountRef = useRef(messages.length)

  // Auto-expand latest when a new message arrives
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      setExpandedMessages(new Set([0]))
      setExpandAll(false)
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  const reversedMessages = [...messages].reverse()

  const toggleMessage = (displayIdx: number) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(displayIdx)) next.delete(displayIdx)
      else next.add(displayIdx)
      return next
    })
  }

  const toggleAll = () => {
    if (expandAll) {
      setExpandedMessages(new Set())
    } else {
      setExpandedMessages(new Set(reversedMessages.map((_, i) => i)))
    }
    setExpandAll(v => !v)
  }

  // Resizable lists open tall and can be dragged to any height (persisted via the
  // inline style from usePersistentHeight); fixed lists keep their compact cap.
  // `resize-y` needs an explicit height (supplied by resizeStyle) as the drag's
  // starting point, bounded by a floor and a viewport-relative ceiling.
  const containerClass = resizable
    ? 'max-h-[85vh] min-h-40 resize-y'
    : maxHeight

  return (
    <div className="space-y-2">
      {showExpandAll && messages.length > 1 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 px-2 text-xs">
            {expandAll ? (
              <><ChevronUp className="mr-1 size-3" />Collapse All</>
            ) : (
              <><ChevronDown className="mr-1 size-3" />Expand All</>
            )}
          </Button>
        </div>
      )}

      <div
        ref={resizable ? resizeRef : undefined}
        style={resizable ? resizeStyle : undefined}
        className={`space-y-2 ${containerClass} overflow-y-auto pr-2`}
      >
        {reversedMessages.map((msg, displayIdx) => {
          const originalIndex = messages.length - displayIdx
          return (
            <MessageCard
              key={`${colorScheme}-${originalIndex}`}
              msg={msg}
              originalIndex={originalIndex}
              isExpanded={expandedMessages.has(displayIdx)}
              isLatest={displayIdx === 0}
              schema={schema}
              isFormMode={isFormMode}
              onToggle={() => toggleMessage(displayIdx)}
              colorScheme={colorScheme}
            />
          )
        })}
      </div>
    </div>
  )
}

export default MessageList
