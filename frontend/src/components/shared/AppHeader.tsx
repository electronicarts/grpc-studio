// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { RefreshCw, Check } from 'lucide-react'
import UserMenu from '@/components/shared/UserMenu'
import { DarkModeToggle } from '@/features/theme'
import { useSchemaLoaderContext } from '@/features/schemaLoader'
import { CertificateStatus } from '@/features/certificateValidator'
import { requestHomeNavigation } from '@/utils/homeNavigation'

export function AppHeader() {
  const { reload, reloading, showSuccessNotification } = useSchemaLoaderContext()

  // Determine button state
  const isSuccess = showSuccessNotification && !reloading
  const isLoading = reloading

  // Button styling based on state
  const buttonClasses = isSuccess
    ? 'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-success/10 text-success transition-all duration-300'
    : 'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-info/10 text-info hover:bg-info/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

  return (
    <header className="border-b bg-gradient-to-r from-muted/50 to-info/5 dark:from-card dark:to-card">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={requestHomeNavigation}
          className="flex items-center space-x-3 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          aria-label="Go to gRPC Studio home"
        >
          <img src="/logo.svg" alt="gRPC Studio" className="size-7" />
          <div>
            <h1 className="text-2xl font-bold">gRPC Studio</h1>
            <p className="text-sm font-medium text-info">Connect, inspect, and call any gRPC service</p>
          </div>
        </button>
        <div className="flex items-center space-x-4">
          <CertificateStatus />
          <button
            onClick={() => reload()}
            disabled={isLoading || isSuccess}
            className={buttonClasses}
            title="Refresh schemas from all servers"
          >
            {isSuccess ? (
              <>
                <Check className="size-4" />
                Refreshed!
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4" />
                Refresh Schemas
              </>
            )}
          </button>
          <UserMenu />
          <DarkModeToggle />
        </div>
      </div>
    </header>
  )
}
