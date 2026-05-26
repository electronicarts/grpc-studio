// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useProtoMessageRendererContext } from '../stores/schemaRendererContext'

interface MessageFieldFrameProps {
  name: string
  typeName?: string
  path: string
  meta?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

const MessageFieldFrame: React.FC<MessageFieldFrameProps> = ({
  name,
  typeName,
  path,
  meta,
  className,
  bodyClassName,
  children,
}) => {
  const { expanded, toggleExpand } = useProtoMessageRendererContext()
  const isExpanded = expanded.has(path)
  const headerMeta = meta ?? (typeName ? <span className="text-xs text-gray-500">({typeName})</span> : null)

  return (
    <div className={cn('space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3', className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => toggleExpand(path)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
        {headerMeta}
      </button>

      {isExpanded && (
        <div className={cn('ml-4 pt-2 border-t border-gray-200 dark:border-gray-700', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}

export default MessageFieldFrame
