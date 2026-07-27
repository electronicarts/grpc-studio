// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useConnectionStatus } from '../useConnectionStatus'
import { fetchConnectionStatus } from '../../api/fetchConnectionStatus'

vi.mock('../../api/fetchConnectionStatus')

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.mocked(fetchConnectionStatus).mockReset()
  })

  it('returns loading state initially', () => {
    vi.mocked(fetchConnectionStatus).mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(result.current.servers).toEqual([])
  })

  it('returns server status data on success', async () => {
    vi.mocked(fetchConnectionStatus).mockResolvedValue({
      servers: [
        {
          name: 'Server1',
          target: 'localhost:50051',
          connected: true,
          servicesCount: 3,
        },
      ],
      loading: false,
    })
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.servers).toHaveLength(1)
    expect(result.current.servers[0].name).toBe('Server1')
    expect(result.current.servers[0].connected).toBe(true)
    expect(result.current.servers[0].servicesCount).toBe(3)
  })

  it('returns empty servers array on fetch failure', async () => {
    vi.mocked(fetchConnectionStatus).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.servers).toEqual([])
  })

  it('handles multiple servers', async () => {
    vi.mocked(fetchConnectionStatus).mockResolvedValue({
      servers: [
        {
          name: 'Server1',
          target: 'localhost:50051',
          connected: true,
          servicesCount: 3,
        },
        {
          name: 'Server2',
          target: 'localhost:50052',
          connected: false,
          servicesCount: 0,
        },
      ],
      loading: false,
    })
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.servers).toHaveLength(2)
    expect(result.current.servers[0].name).toBe('Server1')
    expect(result.current.servers[1].name).toBe('Server2')
  })
})
