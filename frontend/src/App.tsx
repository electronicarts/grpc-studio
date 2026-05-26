// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { lazy, Suspense } from 'react'
import { AppHeader } from '@/components/shared/AppHeader'
import { ConfigError } from '@/components/shared/ConfigError'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingPanel } from '@/components/shared/LoadingPanel'
import { isConfigLoaded } from '@/config'
import { useAutoLogin } from '@/features/auth'

const Playground = lazy(() => import('@/pages/Playground'))

interface AppProps {
  configError?: string | null
}

function App({ configError = null }: AppProps) {
  // Config is loaded in main.tsx before App renders
  const configLoaded = isConfigLoaded()

  const { isAuthenticated, isSsoEnabled } = useAutoLogin()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {configError && <ConfigError message={configError} />}

      {!configLoaded && !configError && (
        <LoadingPanel message="Loading configuration..." testId="app-config-loading" />
      )}

      {configLoaded && !configError && (
        <>
          {isSsoEnabled && !isAuthenticated && (
            <LoadingPanel
              message="Authenticating..."
              className="p-6"
              testId="app-auth-loading"
            />
          )}

          {(!isSsoEnabled || isAuthenticated) && (
            <main className="px-4 py-8 pb-16">
              <ErrorBoundary>
                <Suspense
                  fallback={<LoadingPanel message="Loading playground..." testId="app-playground-loading" />}
                >
                  <Playground />
                </Suspense>
              </ErrorBoundary>
            </main>
          )}
        </>
      )}
    </div>
  )
}

export default App
