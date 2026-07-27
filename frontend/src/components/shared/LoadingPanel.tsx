// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Spinner } from '@/components/ui/spinner'

interface LoadingPanelProps {
  message?: string
  className?: string
  testId?: string
}

export function LoadingPanel({
  message = 'Loading...',
  className = 'p-6',
  testId,
}: LoadingPanelProps) {
  return (
    <div className={className} data-testid={testId}>
      <div className="mx-auto max-w-4xl text-center">
        <Spinner size={8} tone="ring" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
