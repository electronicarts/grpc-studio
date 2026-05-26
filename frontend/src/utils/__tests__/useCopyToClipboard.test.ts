// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCopyToClipboard } from '../../utils/useCopyToClipboard'

describe('useCopyToClipboard', () => {
  const writeMock = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeMock },
      writable: true,
    })
    writeMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start with copied=false', () => {
    const { result } = renderHook(() => useCopyToClipboard())
    expect(result.current.copied).toBe(false)
  })

  it('should set copied=true after calling copy()', () => {
    const { result } = renderHook(() => useCopyToClipboard())
    act(() => { result.current.copy('hello') })
    expect(result.current.copied).toBe(true)
    expect(writeMock).toHaveBeenCalledWith('hello')
  })

  it('should reset copied=false after the timeout', () => {
    const { result } = renderHook(() => useCopyToClipboard(1000))
    act(() => { result.current.copy('text') })
    expect(result.current.copied).toBe(true)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.copied).toBe(false)
  })

  it('should not reset before timeout elapses', () => {
    const { result } = renderHook(() => useCopyToClipboard(2000))
    act(() => { result.current.copy('text') })
    act(() => { vi.advanceTimersByTime(1999) })
    expect(result.current.copied).toBe(true)
  })

  it('should reset the timer if copy is called again before timeout', () => {
    const { result } = renderHook(() => useCopyToClipboard(1000))
    act(() => { result.current.copy('first') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { result.current.copy('second') })
    act(() => { vi.advanceTimersByTime(500) })
    // 500ms after second copy — should still be true
    expect(result.current.copied).toBe(true)
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.copied).toBe(false)
  })
})
