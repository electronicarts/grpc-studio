// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'

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
  const headerMeta = meta ?? (typeName ? <span className="break-all text-xs text-muted-foreground">({typeName})</span> : null)

  return (
    <div className={cn('min-w-0 space-y-2 rounded-lg border border-border p-3', className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => toggleExpand(path)}
        className="flex w-full items-start gap-2 text-left"
      >
        {isExpanded
          ? <ChevronDown className="mt-0.5 size-4 flex-shrink-0" />
          : <ChevronRight className="mt-0.5 size-4 flex-shrink-0" />}
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="break-all font-medium text-foreground">{name}</span>
          {headerMeta}
        </span>
      </button>

      {isExpanded && (
        <div className={cn('ml-4 border-t border-border pt-2', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}

export default MessageFieldFrame
