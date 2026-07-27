// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useResponseModel } from '../useResponseModel'
import { useStreamModel } from '../useStreamModel'
import type { TabResponseSnapshot, TabStreamSnapshot } from '@/stores'

describe('model rehydration from a restored snapshot', () => {
  it('useResponseModel seeds all fields from the snapshot', () => {
    const restored: TabResponseSnapshot = {
      raw: '{"ok":true}',
      data: { ok: true },
      time: 42,
      size: 128,
      schema: null,
      isFormMode: true,
      singleExpanded: false,
    }

    const { result } = renderHook(() => useResponseModel(restored))

    expect(result.current.raw).toBe('{"ok":true}')
    expect(result.current.data).toEqual({ ok: true })
    expect(result.current.time).toBe(42)
    expect(result.current.size).toBe(128)
    expect(result.current.isFormMode).toBe(true)
    expect(result.current.singleExpanded).toBe(false)
  })

  it('useResponseModel defaults to an empty response with no snapshot', () => {
    const { result } = renderHook(() => useResponseModel())
    expect(result.current.raw).toBe('')
    expect(result.current.data).toBeNull()
    expect(result.current.time).toBeNull()
  })

  it('useStreamModel restores accumulated messages but is never active on remount', () => {
    const restored: TabStreamSnapshot = {
      messages: [{ n: 1 }, { n: 2 }],
      sentMessages: [{ req: 'a' }],
      completed: true,
    }

    const { result } = renderHook(() => useStreamModel(restored))

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.sentMessages).toEqual([{ req: 'a' }])
    expect(result.current.completed).toBe(true)
    // A remounted tab has no live socket, so it must not resume as active.
    expect(result.current.active).toBe(false)
    // currentMessages ref is seeded too, so appends continue from the snapshot.
    expect(result.current.currentMessages()).toHaveLength(2)
  })
})
