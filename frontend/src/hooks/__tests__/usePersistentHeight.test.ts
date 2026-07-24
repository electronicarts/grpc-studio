// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, render } from '@testing-library/react'
import { usePersistentHeight } from '../usePersistentHeight'

const KEY = 'test-height-key'

describe('usePersistentHeight', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('falls back to the default height when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentHeight(KEY, '32rem'))
    expect(result.current.style.height).toBe('32rem')
  })

  it('restores a previously saved height (as a px string)', () => {
    localStorage.setItem(KEY, JSON.stringify('540px'))
    const { result } = renderHook(() => usePersistentHeight(KEY, '32rem'))
    expect(result.current.style.height).toBe('540px')
  })

  it('persists height changes the observer reports, debounced', () => {
    // Capture the ResizeObserver callback so we can drive a resize.
    let cb: ResizeObserverCallback | null = null
    const OriginalRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        cb = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    try {
      // Render a real component so the ref is attached to a mounted element
      // before the observe effect runs (renderHook leaves ref.current null).
      const Probe = () => {
        const { ref, style } = usePersistentHeight<HTMLDivElement>(KEY, '32rem')
        return React.createElement('div', { ref, style })
      }
      render(React.createElement(Probe))

      // First fire is the initial measurement and must be ignored.
      cb?.([{ contentRect: { height: 300 } } as ResizeObserverEntry], {} as ResizeObserver)
      vi.advanceTimersByTime(250)
      expect(localStorage.getItem(KEY)).toBeNull()

      // A subsequent (user-driven) resize is persisted after the debounce.
      cb?.([{ contentRect: { height: 612.4 } } as ResizeObserverEntry], {} as ResizeObserver)
      vi.advanceTimersByTime(250)
      expect(localStorage.getItem(KEY)).toBe(JSON.stringify('612px'))
    } finally {
      globalThis.ResizeObserver = OriginalRO
    }
  })

  it('restores the dragged height across remounts (e.g. tab switch), not just reloads', () => {
    let cb: ResizeObserverCallback | null = null
    const OriginalRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        cb = callback
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    try {
      let lastStyle: React.CSSProperties = {}
      const Probe = () => {
        const { ref, style } = usePersistentHeight<HTMLDivElement>(KEY, '32rem')
        lastStyle = style
        return React.createElement('div', { ref, style })
      }
      // Same hook instance stays mounted (mirrors RequestInput); the element it
      // observes is what unmounts and remounts on a tab switch.
      const { rerender } = render(React.createElement(Probe))

      cb?.([{ contentRect: { height: 300 } } as ResizeObserverEntry], {} as ResizeObserver) // initial, ignored
      cb?.([{ contentRect: { height: 480 } } as ResizeObserverEntry], {} as ResizeObserver) // user drag
      vi.advanceTimersByTime(250)

      // Force the element (and its callback ref) to re-run, as a tab switch would.
      rerender(React.createElement(Probe))
      expect(lastStyle.height).toBe('480px')
    } finally {
      globalThis.ResizeObserver = OriginalRO
    }
  })
})
