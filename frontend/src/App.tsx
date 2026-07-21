// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { lazy, Suspense } from 'react'
import { AppHeader } from '@/components/shared/AppHeader'
import { ConfigError } from '@/components/shared/ConfigError'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LoadingPanel } from '@/components/shared/LoadingPanel'
import { isConfigLoaded } from '@/config'
import { useAutoLogin } from '@/features/auth'
import { SchemaLoaderProvider } from '@/features/schemaLoader'

const Playground = lazy(() => import('@/pages/Playground'))

interface AppProps {
  configError?: string | null
}

function App({ configError = null }: AppProps) {
  // Config is loaded in main.tsx before App renders
  const configLoaded = isConfigLoaded()

  const { isAuthenticated, isSsoEnabled } = useAutoLogin()

  return (
    <SchemaLoaderProvider>
      <div className="flex min-h-screen flex-col bg-background">
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
              <main className="flex min-h-0 flex-1 flex-col px-4 py-6">
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
    </SchemaLoaderProvider>
  )
}

export default App
