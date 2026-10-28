// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useJsonView } from '@/features/methodExplorer/hooks/useJsonView'

describe('useJsonView', () => {
  it('computes the wire form only while the wire view is shown', () => {
    const toWire = vi.fn(() => ({ a: 1 }))
    const { result, rerender } = renderHook(() => useJsonView(true, toWire))

    rerender()
    expect(result.current.view).toBe('full')
    expect(toWire).not.toHaveBeenCalled()

    act(() => result.current.setView('wire'))
    expect(result.current.wireText).toBe('{\n  "a": 1\n}')
    expect(toWire).toHaveBeenCalled()
  })

  it('stays on the full view when no wire form can exist', () => {
    const toWire = vi.fn(() => ({ a: 1 }))
    const { result } = renderHook(() => useJsonView(false, toWire))

    act(() => result.current.setView('wire'))

    expect(result.current.view).toBe('full')
    expect(toWire).not.toHaveBeenCalled()
  })

  it('reports the wire form as unavailable when it cannot be computed', () => {
    const { result } = renderHook(() =>
      useJsonView(true, () => {
        throw new Error('bad json')
      }),
    )

    act(() => result.current.setView('wire'))

    expect(result.current.wireUnavailable).toBe(true)
    expect(result.current.wireText).toMatch(/not available/)
  })
})
