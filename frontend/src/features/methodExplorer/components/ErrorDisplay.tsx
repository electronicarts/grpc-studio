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
      className="animate-in fade-in rounded-md p-4 duration-200"
      titleClassName="text-sm mb-1"
      iconClassName="w-5 h-5"
      action={(
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="size-6 p-0 text-danger hover:text-danger/80"
        >
          <XCircle className="size-4" />
        </Button>
      )}
    >
      <div className="mt-1 whitespace-pre-wrap text-sm text-danger">
        {error}
      </div>
    </AlertPanel>
  )
}

export default ErrorDisplay
