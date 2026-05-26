// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'

import { ServiceExplorer, useServiceSelection } from '@/features/serviceExplorer'
import MethodExplorer from '@/features/methodExplorer'
import { CertificateStatus } from '@/features/certificateValidator'
import { SchemaReloadStatus, SchemaLoadingScreen, useSchemaLoader } from '@/features/schemaLoader'
import { StatusPill } from '@/features/connectionValidator'
import { AlertPanel } from '@/components/shared/AlertPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { clearShareFragment } from '@/utils/shareableLink'
import { HOME_NAVIGATION_EVENT } from '@/utils/homeNavigation'

const Playground: React.FC = () => {
  const {
    loading,
    error,
    reloadError,
    targetServer,
    lastFetchedAt,
    lastReloadSuccess,
    reloading,
    reload,
  } = useSchemaLoader()

  const {
    services,
    selectedService,
    selectedMethod,
    sharedRequestBody,
    selectService,
    selectMethod,
    clearSelection,
  } = useServiceSelection()

  const handleReload = React.useCallback(async () => {
    clearSelection()
    await reload()
  }, [clearSelection, reload])

  React.useEffect(() => {
    const handleHomeNavigation = () => {
      clearSelection()
      clearShareFragment()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    window.addEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation)
    return () => window.removeEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation)
  }, [clearSelection])

  const displayError = error ?? reloadError

  return (
    <div className="space-y-8 px-6 pb-10 relative">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative">
        <div className="px-8 py-6 text-center">
          {/* Certificate Status - positioned in top right */}
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
            <CertificateStatus />
            {!loading && (
              <SchemaReloadStatus
                lastFetchedAt={lastFetchedAt}
                lastReloadSuccess={lastReloadSuccess}
                reloading={reloading}
                onReload={handleReload}
              />
            )}
          </div>
          
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">gRPC Studio</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Connect, inspect, and call any gRPC service</p>

          {/* Error State */}
          {displayError && !loading && !reloading && (
            <div className="mt-6">
              <AlertPanel title="Connection Failed" className="rounded-xl p-3 text-left" titleClassName="text-sm mb-1">
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{displayError}</p>
              </AlertPanel>
            </div>
          )}
        </div>
      </div>

      {/* Loading Screen */}
      {(loading || reloading) && <SchemaLoadingScreen targetServer={targetServer} />}

      {/* Main Content Area - Only show if we have services */}
      {!loading && !reloading && !error && services.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Service Explorer */}
          <div className="w-full lg:w-1/4 min-w-0">
            <ErrorBoundary>
              <ServiceExplorer
                selectedService={selectedService}
                selectedMethod={selectedMethod}
                onServiceSelect={selectService}
                onMethodSelect={selectMethod}
              />
            </ErrorBoundary>
          </div>

          {/* Right Panel - Method Explorer */}
          <div className="w-full lg:flex-1 min-w-0">
            <ErrorBoundary>
            {selectedMethod && selectedService ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <MethodExplorer
                  key={`${selectedService?.fullName}-${selectedMethod.name}`}
                  selectedMethod={selectedMethod}
                  selectedService={selectedService}
                  initialRequestBody={sharedRequestBody}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <img src="/logo.svg" alt="gRPC Studio" className="w-16 h-16 mx-auto mb-6 rounded-2xl" />
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Ready to Play</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                      Select a service and method from the sidebar to start playing with your gRPC endpoints
                    </p>
                  </div>
                </div>
              </div>
            )}
            </ErrorBoundary>
          </div>
        </div>
      )}

      <StatusPill />
    </div>
  )
}

export default Playground
