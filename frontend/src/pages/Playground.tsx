// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React, { useState } from 'react'
import { ServiceExplorer, useServiceSelection } from '@/features/serviceExplorer'
import { ServerSelector } from '@/features/serverSelector'
import { SchemaLoadingScreen, SchemaLoaderNotifications, useSchemaLoaderContext } from '@/features/schemaLoader'
import { MethodTabs, TabPanel, useMethodTabs } from '@/features/tabs'
import { AlertPanel } from '@/components/shared/AlertPanel'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { clearShareFragment } from '@/utils/shareableLink'
import { HOME_NAVIGATION_EVENT } from '@/utils/homeNavigation'
import { createLogger } from '@/utils/debugLogger'

const playgroundLogger = createLogger('Playground')

const Playground: React.FC = () => {
  const {
    loading,
    error,
    reloadError,
    reload,
  } = useSchemaLoaderContext()

  const {
    servers,
    services,
    selectedTarget,
    selectedService,
    selectedMethod,
    sharedRequestBody,
    selectService,
    selectMethod,
    clearSelection,
  } = useServiceSelection()

  const [selectedServerNames, setSelectedServerNames] = useState<string[]>([])
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    closeAllTabs,
    duplicateTab,
  } = useMethodTabs({
    selectedTarget,
    selectedService,
    selectedMethod,
    sharedRequestBody,
    onClearSelection: clearSelection,
  })

  // Handle manual tab click - sync to sidebar
  const handleTabClick = React.useCallback((tabId: string) => {
    setActiveTabId(tabId)
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      const server = servers.find(s => s.name === tab.target)
      if (server) {
        selectMethod(tab.method, tab.service, server)
      }
    }
  }, [tabs, servers, setActiveTabId, selectMethod])

  React.useEffect(() => {
    const handleHomeNavigation = () => {
      clearSelection()
      clearShareFragment()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    window.addEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation)
    return () => window.removeEventListener(HOME_NAVIGATION_EVENT, handleHomeNavigation)
  }, [clearSelection])

  // Handle tab visibility - refresh connections when user comes back
  React.useEffect(() => {
    let timeWentHidden: number | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - record the time
        timeWentHidden = Date.now()
      } else {
        // Tab became visible again
        if (timeWentHidden) {
          const timeHidden = Date.now() - timeWentHidden
          // If tab was hidden for more than 5 minutes, refresh schemas to reconnect
          if (timeHidden > 5 * 60 * 1000) {
            playgroundLogger.debug(`Tab was hidden for ${Math.round(timeHidden / 1000)}s, refreshing connections...`)
            reload()
          }
          timeWentHidden = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [reload])

  const displayError = error ?? reloadError

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-6 px-2">
      {/* Error State */}
      {displayError && !loading && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="px-8 py-6">
            <AlertPanel title="Connection Failed" className="rounded-xl p-3 text-left" titleClassName="text-sm mb-1">
              <p className="mt-1 text-sm text-danger">{displayError}</p>
            </AlertPanel>
          </div>
        </div>
      )}

      {/* Initial Loading Screen - only on first load */}
      {loading && <SchemaLoadingScreen />}

      {/* Centralized loading/success notifications */}
      <SchemaLoaderNotifications />

      {/* Main Content Area - Only show if we have services */}
      {!loading && !error && services.length > 0 && (
        <div className="flex flex-1 flex-col gap-6">
          {/* Server Selector */}
          <ErrorBoundary>
            <ServerSelector
              selectedServerNames={selectedServerNames}
              onServerSelect={setSelectedServerNames}
            />
          </ErrorBoundary>

          {/* Two Column Layout */}
          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            {/* Left: Methods — stretches to match the method explorer height so
                both columns are equal height; the service list scrolls inside. */}
            <div className="flex w-full min-w-0 flex-col lg:w-1/4">
              <ErrorBoundary>
                <ServiceExplorer
                  selectedTarget={selectedTarget}
                  selectedService={selectedService}
                  selectedMethod={selectedMethod}
                  onServiceSelect={selectService}
                  onMethodSelect={selectMethod}
                  selectedServerNames={selectedServerNames}
                  serviceSearchQuery={serviceSearchQuery}
                  onSearchChange={setServiceSearchQuery}
                />
              </ErrorBoundary>
            </div>

            {/* Right: Method Explorer */}
            <div className="flex w-full min-w-0 flex-col lg:flex-1">
            <ErrorBoundary>
              {tabs.length > 0 ? (
                <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                  {/* Tab Bar */}
                  <MethodTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabSelect={handleTabClick}
                    onTabClose={closeTab}
                    onTabDuplicate={duplicateTab}
                    onCloseAll={closeAllTabs}
                  />

                  {/* Tab Content — the active tab and any tab with live work
                      (in-flight call / active stream) stay mounted; idle tabs
                      unmount and rehydrate from the per-tab store on return.
                      Height flows with content so the whole page scrolls. */}
                  <div>
                    {tabs.map((tab) => (
                      <TabPanel key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="min-h-[420px] w-full flex-1 self-stretch overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <img src="/logo.svg" alt="gRPC Studio" className="mx-auto mb-6 size-16 rounded-2xl" />
                      <h3 className="mb-3 text-2xl font-semibold text-foreground">Ready to Play</h3>
                      <p className="mx-auto max-w-sm text-lg text-muted-foreground">
                        Select a service and method from the sidebar to start playing with your gRPC endpoints
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Playground
