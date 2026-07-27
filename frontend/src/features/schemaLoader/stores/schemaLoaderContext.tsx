// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useSchemaLoader } from '../hooks/useSchemaReload'
import { useSchemas } from '../hooks/useSchemas'
import type { ApiServer } from '../../../types/grpc'

interface SchemaLoaderContextType {
  // Data
  servers: ApiServer[]

  // Loading states
  loading: boolean
  reloading: boolean
  reloadingServer: string | null

  // Status
  error: string | null
  reloadError: string | null
  lastFetchedAt: Date | null
  lastReloadSuccess: boolean | null

  // Actions
  reload: (target?: string) => void

  // UI feedback state
  showSuccessNotification: boolean
  dismissSuccessNotification: () => void
}

const SchemaLoaderContext = createContext<SchemaLoaderContextType | null>(null)

export function SchemaLoaderProvider({ children }: { children: React.ReactNode }) {
  const loader = useSchemaLoader()
  const { servers } = useSchemas()
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)

  // Surface a transient success banner whenever a reload succeeds.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (loader.lastReloadSuccess === true && !loader.reloading) {
      setShowSuccessNotification(true)
      dismissTimer.current = setTimeout(() => setShowSuccessNotification(false), 3000)
      return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
    }
  }, [loader.lastReloadSuccess, loader.reloading])

  const dismissSuccessNotification = useCallback(() => setShowSuccessNotification(false), [])

  const value: SchemaLoaderContextType = {
    servers,
    loading: loader.loading,
    reloading: loader.reloading,
    reloadingServer: loader.reloadingServer,
    error: loader.error,
    reloadError: loader.reloadError,
    lastFetchedAt: loader.lastFetchedAt,
    lastReloadSuccess: loader.lastReloadSuccess,
    reload: loader.reload,
    showSuccessNotification,
    dismissSuccessNotification,
  }

  return (
    <SchemaLoaderContext.Provider value={value}>
      {children}
    </SchemaLoaderContext.Provider>
  )
}

export function useSchemaLoaderContext() {
  const context = useContext(SchemaLoaderContext)
  if (!context) {
    throw new Error('useSchemaLoaderContext must be used within SchemaLoaderProvider')
  }
  return context
}
