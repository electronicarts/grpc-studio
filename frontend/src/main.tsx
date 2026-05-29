// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { AuthProvider, initializeAuthFromYaml } from './features/auth'
import { DarkModeProvider } from './features/theme'
import { loadConfig } from './config'
import { createLogger } from './utils/debugLogger'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
})

const logger = createLogger('Bootstrap')

const root = ReactDOM.createRoot(document.getElementById('root')!)

function renderApp(configError: string | null = null) {
  root.render(
    <React.StrictMode>
      <DarkModeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App configError={configError} />
          </AuthProvider>
        </QueryClientProvider>
      </DarkModeProvider>
    </React.StrictMode>,
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Configuration loading failed'
}

loadConfig()
  .then(async (config) => {
    await initializeAuthFromYaml(config.auth)
    renderApp()
  })
  .catch((error) => {
    logger.error('Failed to load config:', error)
    renderApp(getErrorMessage(error))
  })
