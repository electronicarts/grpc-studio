// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AlertPanelProps {
  title: string
  children?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  className?: string
  titleClassName?: string
  iconClassName?: string
}

export function AlertPanel({
  title,
  children,
  action,
  footer,
  className,
  titleClassName,
  iconClassName,
}: AlertPanelProps) {
  return (
    <div className={cn('bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className={cn('h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0', iconClassName)} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={cn('text-lg font-semibold text-red-800 dark:text-red-200 mb-2', titleClassName)}>
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
