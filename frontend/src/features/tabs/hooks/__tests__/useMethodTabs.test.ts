// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMethodTabs } from '../useMethodTabs'
import { tabStateStore, type TabStateSnapshot } from '@/stores'
import type { GrpcMethod, GrpcService } from '../../../../types/grpc'
import { MethodKind } from '@grpc-studio/shared'

const emptySnapshot = (): TabStateSnapshot => ({
  request: { body: '{}', formData: {}, formKey: 0, isFormMode: true, schema: null, validationError: null },
  response: { raw: '', data: null, time: null, size: null, schema: null, isFormMode: false, singleExpanded: true },
  stream: { messages: [], sentMessages: [], completed: false },
  historyVisible: false,
})

const service: GrpcService = {
  name: 'UserService',
  fullName: 'com.example.UserService',
  methods: [],
}

const method: GrpcMethod = {
  name: 'GetUser',
  inputType: 'GetUserRequest',
  outputType: 'User',
  kind: MethodKind.UNARY,
}

const otherMethod: GrpcMethod = {
  name: 'ListUsers',
  inputType: 'ListUsersRequest',
  outputType: 'ListUsersResponse',
  kind: MethodKind.UNARY,
}

const baseProps = {
  selectedTarget: 'Server1',
  selectedService: service,
  selectedMethod: method,
  sharedRequestBody: null,
  sharedMetadata: null,
}

const otherProps = {
  selectedTarget: 'Server1',
  selectedService: service,
  selectedMethod: otherMethod,
  sharedRequestBody: null,
  sharedMetadata: null,
}

describe('useMethodTabs', () => {
  beforeEach(() => {
    localStorage.clear()
    tabStateStore.clearAll()
  })

  it('opens one tab for a selected method', () => {
    const { result } = renderHook(() => useMethodTabs(baseProps))

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.activeTabId).toBe('Server1::com.example.UserService::GetUser')
  })

  it('duplicateTab creates a distinct tab and focuses it', () => {
    const { result } = renderHook(() => useMethodTabs(baseProps))
    const originalId = result.current.activeTabId!

    act(() => result.current.duplicateTab(originalId))

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.activeTabId).not.toBe(originalId)
    expect(result.current.activeTabId).toBe(`${originalId}#1`)
    // Both tabs point at the same target/service/method.
    expect(result.current.tabs[1].target).toBe('Server1')
    expect(result.current.tabs[1].method.name).toBe('GetUser')
  })

  it('does not steal focus back to the canonical tab while a duplicate is active', () => {
    // Re-render with the same selection (as happens on any parent re-render).
    const { result, rerender } = renderHook((props) => useMethodTabs(props), {
      initialProps: baseProps,
    })
    const originalId = result.current.activeTabId!

    act(() => result.current.duplicateTab(originalId))
    const dupId = result.current.activeTabId!

    rerender(baseProps)

    // Selection sync must leave the active duplicate alone (it matches the selection).
    expect(result.current.activeTabId).toBe(dupId)
    expect(result.current.tabs).toHaveLength(2)
  })

  it('switches to an existing tab instead of creating a duplicate on re-select', () => {
    const { result, rerender } = renderHook((props) => useMethodTabs(props), {
      initialProps: baseProps,
    })
    const originalId = result.current.activeTabId!

    // Open a different method (now active), then re-select the first one.
    rerender(otherProps)
    expect(result.current.tabs).toHaveLength(2)
    rerender(baseProps)

    // Should switch back to the existing GetUser tab, not create a third tab.
    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.activeTabId).toBe(originalId)
  })

  it('closeTab clears the tab\'s stored state so a reopened id starts fresh', () => {
    const { result, rerender } = renderHook((props) => useMethodTabs(props), {
      initialProps: baseProps,
    })
    const id = result.current.activeTabId!
    tabStateStore.setSnapshot(id, emptySnapshot())
    expect(tabStateStore.getSnapshot(id)).toBeDefined()

    act(() => result.current.closeTab(id))

    // Stored state is gone, so reopening the same (deterministic) id is clean.
    expect(tabStateStore.getSnapshot(id)).toBeUndefined()

    rerender(baseProps)
    expect(tabStateStore.getSnapshot(result.current.activeTabId!)).toBeUndefined()
  })

  it('closeAllTabs clears all stored tab state', () => {
    const { result, rerender } = renderHook((props) => useMethodTabs(props), {
      initialProps: baseProps,
    })
    const firstId = result.current.activeTabId!
    rerender(otherProps)
    const secondId = result.current.activeTabId!
    tabStateStore.setSnapshot(firstId, emptySnapshot())
    tabStateStore.setSnapshot(secondId, emptySnapshot())

    act(() => result.current.closeAllTabs())

    expect(tabStateStore.getSnapshot(firstId)).toBeUndefined()
    expect(tabStateStore.getSnapshot(secondId)).toBeUndefined()
  })
})
