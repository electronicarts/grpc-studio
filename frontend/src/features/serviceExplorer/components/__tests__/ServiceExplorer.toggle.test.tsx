// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ServiceExplorer from '../ServiceExplorer'
import { useSchemas } from '../../../schemaLoader'
import type { GrpcService, ApiServer } from '../../../../types/grpc'
import { MethodKind } from '@grpc-studio/shared'

vi.mock('../../../schemaLoader', () => ({
  useSchemas: vi.fn(),
}))

function mockServers(servers: ApiServer[]) {
  vi.mocked(useSchemas).mockReturnValue({
    servers,
    services: servers.flatMap(s => s.services),
    loading: false,
    error: null,
    lastFetchedAt: null,
  })
}

const service: GrpcService = {
  name: 'UserService',
  fullName: 'com.example.UserService',
  methods: [
    { name: 'GetUser', inputType: 'GetUserRequest', outputType: 'User', kind: MethodKind.UNARY },
  ],
}

const server: ApiServer = {
  name: 'Server1',
  target: 'localhost:50051',
  services: [service],
}

// A second server exposing the SAME service + method under a different name.
const server2: ApiServer = {
  name: 'Server2',
  target: 'localhost:50052',
  services: [service],
}

function renderExplorer(overrides: Partial<React.ComponentProps<typeof ServiceExplorer>> = {}) {
  const onServiceSelect = vi.fn()
  const onSearchChange = vi.fn()
  const props = {
    selectedTarget: null,
    selectedService: null,
    selectedMethod: null,
    onServiceSelect,
    onMethodSelect: vi.fn(),
    selectedServerNames: [],
    serviceSearchQuery: '',
    onSearchChange,
    ...overrides,
  }
  const utils = render(<ServiceExplorer {...props} />)
  return { onServiceSelect, onSearchChange, ...utils }
}

describe('ServiceExplorer toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockServers([server])
  })

  it('selects a service on the first click', () => {
    const { onServiceSelect } = renderExplorer()

    fireEvent.click(screen.getByText('UserService'))

    expect(onServiceSelect).toHaveBeenCalledTimes(1)
    expect(onServiceSelect).toHaveBeenCalledWith(service, server)
  })

  it('selects on the first click even when the row was auto-expanded by search', () => {
    // Search auto-expands the first match without selecting it — this is the
    // state that previously required a second click to actually select.
    const { onServiceSelect } = renderExplorer({ serviceSearchQuery: 'User' })

    fireEvent.click(screen.getByText('UserService'))

    expect(onServiceSelect).toHaveBeenCalledTimes(1)
    expect(onServiceSelect).toHaveBeenCalledWith(service, server)
  })

  it('collapses when clicking the already-selected, expanded row', () => {
    const { onServiceSelect } = renderExplorer({ selectedTarget: 'Server1', selectedService: service })

    // Method of the selected+expanded service is visible.
    expect(screen.getByText('GetUser')).toBeInTheDocument()

    fireEvent.click(screen.getByText('UserService'))

    // Collapsing should not re-select, and the method should disappear.
    expect(onServiceSelect).not.toHaveBeenCalled()
    expect(screen.queryByText('GetUser')).not.toBeInTheDocument()
  })

  it('expands a non-first search match in a single click', () => {
    // Two services both match the query "Service". Alphabetically AdminService sorts
    // before UserService, so UserService is NOT the auto-expanded first match. Clicking
    // it must select AND expand it in one click — previously the search auto-expand
    // effect re-fired on selection change and collapsed it, requiring a second click.
    const adminService: GrpcService = {
      name: 'AdminService',
      fullName: 'com.example.AdminService',
      methods: [
        { name: 'GetAdmin', inputType: 'GetAdminRequest', outputType: 'Admin', kind: MethodKind.UNARY },
      ],
    }
    mockServers([{ name: 'Server1', target: 'localhost:50051', services: [adminService, service] }])

    const onServiceSelect = vi.fn()
    const { rerender } = render(
      <ServiceExplorer
        selectedTarget={null}
        selectedService={null}
        selectedMethod={null}
        onServiceSelect={onServiceSelect}
        onMethodSelect={vi.fn()}
        selectedServerNames={[]}
        serviceSearchQuery="Service"
        onSearchChange={vi.fn()}
      />
    )

    // Auto-expand picked the first match (AdminService), so GetUser is hidden.
    expect(screen.queryByText('GetUser')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('UserService'))
    expect(onServiceSelect).toHaveBeenCalledTimes(1)
    expect(onServiceSelect.mock.calls[0][0]).toBe(service)
    expect(onServiceSelect.mock.calls[0][1].name).toBe('Server1')

    // The parent would propagate the selection back down as props; simulate that.
    rerender(
      <ServiceExplorer
        selectedTarget="Server1"
        selectedService={service}
        selectedMethod={null}
        onServiceSelect={onServiceSelect}
        onMethodSelect={vi.fn()}
        selectedServerNames={[]}
        serviceSearchQuery="Service"
        onSearchChange={vi.fn()}
      />
    )

    // UserService is now expanded (its method is visible) after a single click.
    expect(screen.getByText('GetUser')).toBeInTheDocument()
  })

  it('only expands the selected server row when two servers share a service', () => {
    mockServers([server, server2])

    // UserService selected on Server1 only.
    renderExplorer({ selectedTarget: 'Server1', selectedService: service })

    // Both servers list the service, but only Server1's row is expanded, so
    // exactly one GetUser method is rendered (not both rows at once).
    expect(screen.getAllByText('UserService')).toHaveLength(2)
    expect(screen.getAllByText('GetUser')).toHaveLength(1)
  })
})
