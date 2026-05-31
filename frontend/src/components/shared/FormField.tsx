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
      <label className={cn('flex items-center gap-2 cursor-pointer', className)}>
        {children}
        <span className={cn('text-sm text-gray-700 dark:text-gray-300', labelClassName)}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {labelMeta && <span className="ml-1">{labelMeta}</span>}
        </span>
      </label>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <label className={cn(
        'flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300',
        labelClassName
      )}>
        <span>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {labelMeta}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

export default FormField
