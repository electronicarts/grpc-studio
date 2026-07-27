// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest'
import { tabStateStore, type TabStateSnapshot } from '../tabStateStore'

const snapshot = (body: string): TabStateSnapshot => ({
  request: { body, formData: {}, formKey: 0, isFormMode: true, schema: null, validationError: null },
  response: { raw: '', data: null, time: null, size: null, schema: null, isFormMode: false, singleExpanded: true },
  stream: { messages: [], sentMessages: [], completed: false },
  historyVisible: false,
})

describe('tabStateStore', () => {
  beforeEach(() => {
    tabStateStore.clearAll()
  })

  describe('snapshots', () => {
    it('stores and retrieves a per-tab snapshot', () => {
      tabStateStore.setSnapshot('tabA', snapshot('{"x":1}'))
      expect(tabStateStore.getSnapshot('tabA')?.request.body).toBe('{"x":1}')
    })

    it('returns undefined for an unknown tab', () => {
      expect(tabStateStore.getSnapshot('missing')).toBeUndefined()
    })

    it('keeps snapshots isolated per tab id', () => {
      tabStateStore.setSnapshot('tabA', snapshot('A'))
      tabStateStore.setSnapshot('tabB', snapshot('B'))
      expect(tabStateStore.getSnapshot('tabA')?.request.body).toBe('A')
      expect(tabStateStore.getSnapshot('tabB')?.request.body).toBe('B')
    })

    it('does not notify subscribers when only a snapshot changes', () => {
      let calls = 0
      const unsub = tabStateStore.subscribe(() => { calls++ })
      tabStateStore.setSnapshot('tabA', snapshot('A'))
      expect(calls).toBe(0)
      unsub()
    })
  })

  describe('live work', () => {
    it('tracks and reports live work per tab', () => {
      expect(tabStateStore.hasLiveWork('tabA')).toBe(false)
      tabStateStore.setLiveWork('tabA', true)
      expect(tabStateStore.hasLiveWork('tabA')).toBe(true)
      tabStateStore.setLiveWork('tabA', false)
      expect(tabStateStore.hasLiveWork('tabA')).toBe(false)
    })

    it('notifies subscribers when live work changes', () => {
      let calls = 0
      const unsub = tabStateStore.subscribe(() => { calls++ })
      tabStateStore.setLiveWork('tabA', true)
      expect(calls).toBe(1)
      unsub()
    })

    it('does not notify when live work is unchanged', () => {
      tabStateStore.setLiveWork('tabA', true)
      let calls = 0
      const unsub = tabStateStore.subscribe(() => { calls++ })
      tabStateStore.setLiveWork('tabA', true) // no-op
      expect(calls).toBe(0)
      unsub()
    })

    it('exposes a stable key for useSyncExternalStore', () => {
      tabStateStore.setLiveWork('b', true)
      tabStateStore.setLiveWork('a', true)
      // Sorted + joined, so member set — not insertion order — defines identity.
      expect(tabStateStore.getLiveWorkKey()).toBe('a|b')
    })
  })

  describe('cleanup', () => {
    it('remove() drops the snapshot and clears live work', () => {
      tabStateStore.setSnapshot('tabA', snapshot('A'))
      tabStateStore.setLiveWork('tabA', true)

      tabStateStore.remove('tabA')

      expect(tabStateStore.getSnapshot('tabA')).toBeUndefined()
      expect(tabStateStore.hasLiveWork('tabA')).toBe(false)
    })

    it('remove() notifies subscribers when the tab had live work', () => {
      tabStateStore.setLiveWork('tabA', true)
      let calls = 0
      const unsub = tabStateStore.subscribe(() => { calls++ })
      tabStateStore.remove('tabA')
      expect(calls).toBe(1)
      unsub()
    })

    it('clearAll() removes every snapshot and all live work', () => {
      tabStateStore.setSnapshot('tabA', snapshot('A'))
      tabStateStore.setSnapshot('tabB', snapshot('B'))
      tabStateStore.setLiveWork('tabA', true)

      tabStateStore.clearAll()

      expect(tabStateStore.getSnapshot('tabA')).toBeUndefined()
      expect(tabStateStore.getSnapshot('tabB')).toBeUndefined()
      expect(tabStateStore.hasLiveWork('tabA')).toBe(false)
    })
  })
})
