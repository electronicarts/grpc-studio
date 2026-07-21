// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TONES, type Tone } from '@/utils/tones'

interface AlertPanelProps {
  title: string
  /** Semantic color of the panel. Defaults to `danger` (its original look). */
  tone?: Tone
  children?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  className?: string
  titleClassName?: string
  iconClassName?: string
}

export function AlertPanel({
  title,
  tone = 'danger',
  children,
  action,
  footer,
  className,
  titleClassName,
  iconClassName,
}: AlertPanelProps) {
  const t = TONES[tone]
  return (
    <div className={cn('rounded-lg border p-6', t.bg, t.border, className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className={cn('mt-0.5 size-6 flex-shrink-0', t.text, iconClassName)} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn('mb-2 text-lg font-semibold', t.text, titleClassName)}>
              {title}
            </h3>
            {action}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}
