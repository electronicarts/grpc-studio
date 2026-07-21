// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useServerSelector } from '../useServerSelector'
import { useSchemas, useSchemaLoader } from '@/features/schemaLoader'
import { useConnectionStatus } from '@/features/connectionValidator'
import type { ApiServer } from '../../../../types/grpc'

vi.mock('@/features/schemaLoader', () => ({
  useSchemas: vi.fn(),
  useSchemaLoader: vi.fn(),
}))

vi.mock('@/features/connectionValidator', () => ({
  useConnectionStatus: vi.fn(),
}))

function server(name: string): ApiServer {
  return { name, target: 'localhost:50051', services: [] }
}

function mockServers(servers: ApiServer[]) {
  vi.mocked(useSchemas).mockReturnValue({
    servers,
    services: [],
    loading: false,
    error: null,
    lastFetchedAt: null,
  })
}

describe('useServerSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSchemaLoader).mockReturnValue({ reload: vi.fn(), reloading: false } as never)
    vi.mocked(useConnectionStatus).mockReturnValue({ servers: [] } as never)
  })

  it('returns target servers sorted alphabetically by name', () => {
    mockServers([server('Zeta'), server('alpha'), server('Beta')])

    const { result } = renderHook(() =>
      useServerSelector({ selectedServerNames: [], onServerSelect: vi.fn() })
    )

    expect(result.current.servers.map((s) => s.name)).toEqual(['alpha', 'Beta', 'Zeta'])
  })

  it('does not mutate the source array from useSchemas', () => {
    const source = [server('Zeta'), server('Alpha')]
    mockServers(source)

    renderHook(() => useServerSelector({ selectedServerNames: [], onServerSelect: vi.fn() }))

    // The hook must sort a copy, leaving the schema store's array order intact.
    expect(source.map((s) => s.name)).toEqual(['Zeta', 'Alpha'])
  })
})
