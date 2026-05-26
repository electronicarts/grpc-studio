// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import { AlertPanel } from '@/components/shared/AlertPanel'

interface ErrorDisplayProps {
  error: string | null
  onDismiss: () => void
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null

  return (
    <AlertPanel
      title="Error"
      className="rounded-md p-4 animate-in fade-in duration-200"
      titleClassName="text-sm mb-1"
      iconClassName="w-5 h-5 text-red-500"
      action={(
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
        >
          <XCircle className="w-4 h-4" />
        </Button>
      )}
    >
      <div className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap">
        {error}
      </div>
    </AlertPanel>
  )
}

export default ErrorDisplay
