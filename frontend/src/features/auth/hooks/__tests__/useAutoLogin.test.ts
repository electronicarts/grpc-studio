// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAutoLogin } from '../useAutoLogin'
import { useAuth } from '../useAuth'

vi.mock('../useAuth')

const mockLogin = vi.fn()

function mockAuthState(overrides: {
  isAuthenticated?: boolean
  isLoading?: boolean
  isSsoEnabled?: boolean
}) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    isSsoEnabled: false,
    user: null,
    accessToken: null,
    login: mockLogin,
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    ...overrides,
  })
}

describe('useAutoLogin', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockLogin.mockResolvedValue(undefined)
  })

  it('does not call login when SSO is disabled', () => {
    mockAuthState({ isSsoEnabled: false })
    renderHook(() => useAutoLogin())
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('does not call login while auth is loading', () => {
    mockAuthState({ isSsoEnabled: true, isLoading: true })
    renderHook(() => useAutoLogin())
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('does not call login when already authenticated', () => {
    mockAuthState({ isSsoEnabled: true, isAuthenticated: true })
    renderHook(() => useAutoLogin())
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login when SSO enabled, not authenticated, not loading', async () => {
    mockAuthState({ isSsoEnabled: true, isAuthenticated: false, isLoading: false })
    renderHook(() => useAutoLogin())
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1))
  })

  it('does not call login twice on re-render', async () => {
    mockAuthState({ isSsoEnabled: true, isAuthenticated: false, isLoading: false })
    const { rerender } = renderHook(() => useAutoLogin())
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1))
    rerender()
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('returns auth state', () => {
    mockAuthState({ isSsoEnabled: true, isAuthenticated: false, isLoading: false })
    const { result } = renderHook(() => useAutoLogin())
    expect(result.current).toMatchObject({
      isAuthenticated: false,
      isLoading: false,
      isSsoEnabled: true,
    })
  })
})
