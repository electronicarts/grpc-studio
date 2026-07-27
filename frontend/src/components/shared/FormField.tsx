// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { cn } from '@/utils/cn'

interface FormFieldProps {
  label: string
  labelMeta?: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  labelClassName?: string
  inline?: boolean
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  labelMeta,
  required = false,
  error,
  hint,
  children,
  className,
  labelClassName,
  inline = false
}) => {
  if (inline) {
    return (
      <label className={cn('flex cursor-pointer items-center gap-2', className)}>
        {children}
        <span className={cn('text-sm text-foreground/90', labelClassName)}>
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
          {labelMeta && <span className="ml-1">{labelMeta}</span>}
        </span>
      </label>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <label className={cn(
        'flex flex-wrap items-baseline gap-x-1 text-sm font-medium text-foreground/90',
        labelClassName
      )}>
        <span className="break-all">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
        {labelMeta}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  )
}

export default FormField
