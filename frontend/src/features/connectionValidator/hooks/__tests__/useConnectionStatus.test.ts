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
    expect(result.current.connected).toBe(false)
  })

  it('returns connection data on success', async () => {
    vi.mocked(fetchConnectionStatus).mockResolvedValue({
      connected: true,
      targetServer: 'localhost:50051',
      servicesCount: 3,
      error: null,
      loading: false,
    })
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connected).toBe(true)
    expect(result.current.targetServer).toBe('localhost:50051')
    expect(result.current.servicesCount).toBe(3)
  })

  it('returns error message on fetch failure', async () => {
    vi.mocked(fetchConnectionStatus).mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useConnectionStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connected).toBe(false)
    expect(result.current.error).toContain('Network error')
  })
})
