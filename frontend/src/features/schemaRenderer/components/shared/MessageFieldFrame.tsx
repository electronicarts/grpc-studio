// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useProtoMessageRendererContext } from '../../stores/schemaRendererContext'
import PresenceCheckbox from './PresenceCheckbox'
import type { FieldPresence } from './fieldPresence'

interface MessageFieldFrameProps {
  name: string
  typeName?: string
  path: string
  meta?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
  /** When provided, a header checkbox decides whether the field is sent; its contents show only while ticked. */
  presence?: FieldPresence
}

/**
 * A framed section for messages, Struct, lists and maps.
 * Read-only views collapse and expand it with a chevron. When editing it is always open, unless its
 * checkbox is unticked, in which case it is left out of the request and its contents are hidden.
 */
const MessageFieldFrame: React.FC<MessageFieldFrameProps> = ({
  name,
  typeName,
  path,
  meta,
  className,
  bodyClassName,
  children,
  presence,
}) => {
  const { expanded, toggleExpand, readOnly } = useProtoMessageRendererContext()
  const isOpen = readOnly ? expanded.has(path) : presence?.isSet ?? true
  const headerMeta = meta ?? (typeName ? <span className="break-all text-xs text-muted-foreground">({typeName})</span> : null)

  const title = (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <span className="break-all font-medium text-foreground">{name}</span>
      {headerMeta}
    </span>
  )

  return (
    <div className={cn('min-w-0 space-y-2 rounded-lg border border-border p-3', className)}>
      {readOnly ? (
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleExpand(path)}
          className="flex w-full items-start gap-2 text-left"
        >
          {isOpen
            ? <ChevronDown className="mt-0.5 size-4 flex-shrink-0" />
            : <ChevronRight className="mt-0.5 size-4 flex-shrink-0" />}
          {title}
        </button>
      ) : (
        <label className={cn('flex w-full items-start gap-2', presence && 'cursor-pointer')}>
          {presence && <PresenceCheckbox name={name} presence={presence} className="mt-0.5" />}
          {title}
        </label>
      )}

      {isOpen && (
        <div className={cn('ml-4 border-t border-border pt-2', bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  )
}

export default MessageFieldFrame
