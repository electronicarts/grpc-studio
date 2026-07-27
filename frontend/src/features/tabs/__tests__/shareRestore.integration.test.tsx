// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * End-to-end regression for the share round-trip:
 *   share URL  →  useShareableLink restores selection
 *              →  useMethodTabs opens a tab carrying the shared body
 *              →  MethodExplorer mounts and exposes that body via context.
 *
 * Only the true network leaves are mocked (schema fetch + WebSocket); the
 * selection → tab → provider wiring is exercised for real.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useServiceSelection } from '../../serviceExplorer/hooks/useServiceDiscovery'
import { useMethodTabs } from '../hooks/useMethodTabs'
import { tabStateStore } from '@/stores'
import { MethodExplorerProvider, useMethodExplorerContext } from '../../methodExplorer/stores'
import { buildShareableUrl } from '../../../utils/shareableLink'
import type { ApiServer, GrpcService, GrpcMethod } from '../../../types/grpc'
import { MethodKind } from '@grpc-studio/shared'

// ── deterministic schema source ───────────────────────────────────────────
const service: GrpcService = {
  name: 'UserService',
  fullName: 'com.example.UserService',
  methods: [
    { name: 'GetUser', inputType: 'GetUserRequest', outputType: 'User', kind: MethodKind.UNARY },
  ],
}
const method = service.methods[0] as GrpcMethod
const server: ApiServer = { name: 'Server1', target: 'localhost:50051', services: [service] }

// The schema cache is consulted synchronously during render; return null so the
// request body is used verbatim (no canonicalization rewrites in this test).
vi.mock('../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    subscribe: vi.fn(() => () => {}),
    getCachedSchema: vi.fn(() => null),
    getSchema: vi.fn(() => Promise.resolve(null)),
    getCacheSize: vi.fn(() => 0),
    getSchemaMap: vi.fn(() => new Map()),
  },
}))

// Servers/services come from React Query in the real app; feed them directly.
vi.mock('../../schemaLoader', () => ({
  useSchemas: vi.fn(() => ({
    servers: [server],
    services: [service],
    loading: false,
    error: null,
    lastFetchedAt: null,
  })),
}))

// Keep the WebSocket inert (unary path here never opens it, but be safe).
vi.mock('../../methodExplorer/hooks/useGrpcWebSocket', () => ({
  useGrpcWebSocket: () => ({
    start: vi.fn(), sendData: vi.fn(), endStream: vi.fn(), cancel: vi.fn(), close: vi.fn(),
    isConnected: false, isStreaming: false,
  }),
}))

// Surfaces the request body the mounted tab's provider is holding.
function BodyProbe() {
  const { request } = useMethodExplorerContext()
  return <div data-testid="probe-body">{request.body}</div>
}

// Minimal stand-in for Playground's tab wiring. Mirrors TabPanel's mount rule
// (render the active tab) but injects a probe inside the real provider so the
// restored request body is observable.
function MiniApp() {
  const {
    selectedTarget, selectedService, selectedMethod, sharedRequestBody, clearSelection,
  } = useServiceSelection()

  const { tabs, activeTabId } = useMethodTabs({
    selectedTarget, selectedService, selectedMethod, sharedRequestBody,
    onClearSelection: clearSelection,
  })

  return (
    <>
      {tabs.map((tab) => (
        <div key={tab.id} className={tab.id === activeTabId ? '' : 'hidden'}>
          <MethodExplorerProvider
            tabId={tab.id}
            selectedTarget={tab.target}
            selectedService={tab.service}
            selectedMethod={tab.method}
            initialRequestBody={tab.requestBody}
          >
            <BodyProbe />
          </MethodExplorerProvider>
        </div>
      ))}
    </>
  )
}

describe('share restore (integration)', () => {
  beforeEach(() => {
    tabStateStore.clearAll()
    localStorage.clear()
  })

  afterEach(() => {
    window.location.hash = ''
  })

  it('opens a tab from a share link with the shared request body applied', async () => {
    const sharedBody = { id: '42', includeProfile: true }
    const url = buildShareableUrl(service.fullName, method.name, sharedBody)
    // Apply just the hash fragment the link encodes.
    window.location.hash = new URL(url).hash

    await act(async () => {
      render(<MiniApp />)
    })

    // A tab was opened for the shared method…
    const probe = await screen.findByTestId('probe-body')
    // …and it carries the shared request body.
    expect(JSON.parse(probe.textContent || '{}')).toEqual(sharedBody)
  })
})
