// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

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
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}
