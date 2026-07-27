// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarLayout } from '../useSidebarLayout'

describe('useSidebarLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to expanded', () => {
    const { result } = renderHook(() => useSidebarLayout())
    expect(result.current.collapsed).toBe(false)
  })

  it('toggles the collapsed state', () => {
    const { result } = renderHook(() => useSidebarLayout())
    act(() => result.current.toggleCollapsed())
    expect(result.current.collapsed).toBe(true)
    act(() => result.current.toggleCollapsed())
    expect(result.current.collapsed).toBe(false)
  })

  it('persists the collapsed state across remounts', () => {
    const first = renderHook(() => useSidebarLayout())
    act(() => first.result.current.toggleCollapsed())
    expect(first.result.current.collapsed).toBe(true)

    const second = renderHook(() => useSidebarLayout())
    expect(second.result.current.collapsed).toBe(true)
  })
})
