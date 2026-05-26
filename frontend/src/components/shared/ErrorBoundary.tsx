// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Component, ErrorInfo, ReactNode } from 'react'
import { RefreshCcw } from 'lucide-react'
import { createLogger } from '@/utils/debugLogger'
import { AlertPanel } from './AlertPanel'

const logger = createLogger('ErrorBoundary')

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6">
          <AlertPanel
            title="Something went wrong"
            className="max-w-lg mx-auto"
            footer={(
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                Try Again
              </button>
            )}
          >
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </AlertPanel>
        </div>
      )
    }

    return this.props.children
  }
}
