// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMethodInvocation } from '../useMethodInvocation'
import { MethodKind } from '@grpc-studio/shared'
import type { GrpcService, GrpcMethod } from '../../../../types/grpc'
import type { RequestModel, ResponseModel, StreamModel } from '../../types'

// Mock the API and WebSocket dependencies
vi.mock('../../api', () => ({
  invokeUnary: vi.fn(),
}))

vi.mock('../useGrpcWebSocket', () => ({
  useGrpcWebSocket: () => ({
    start: vi.fn(),
    sendData: vi.fn(),
    endStream: vi.fn(),
    cancel: vi.fn(),
    close: vi.fn(),
    isConnected: true,
    isStreaming: false,
  }),
}))

vi.mock('../useStreamInvocationCallbacks', () => ({
  useStreamInvocationCallbacks: () => ({
    handleStreamResponse: vi.fn(),
    handleStreamError: vi.fn(),
    handleStreamComplete: vi.fn(),
  }),
}))

vi.mock('../useUnaryInvocationRecorder', () => ({
  useUnaryInvocationRecorder: () => ({
    recordUnarySuccess: vi.fn(),
    recordUnaryError: vi.fn(),
  }),
}))

vi.mock('../utils/payload', () => ({
  toWireFormat: (input: unknown) => ({ wire: input, display: input }),
}))

describe('useMethodInvocation - cancelStream', () => {
  const mockService: GrpcService = {
    fullName: 'test.Service',
    name: 'Service',
    methods: [],
  }

  const mockMethod: GrpcMethod = {
    name: 'StreamMethod',
    fullName: 'test.Service.StreamMethod',
    kind: MethodKind.SERVER_STREAMING,
    inputType: 'test.Request',
    outputType: 'test.Response',
  }

  const createMockRequest = (): RequestModel => ({
    body: '{"name": "test"}',
    formData: { name: 'test' },
    isFormMode: true,
    schema: null,
    setBody: vi.fn(),
    setFormData: vi.fn(),
    toggleMode: vi.fn(),
    reset: vi.fn(),
    clear: vi.fn(),
  })

  const createMockResponse = (): ResponseModel => ({
    body: '',
    status: null,
    setBody: vi.fn(),
    setStatus: vi.fn(),
    clear: vi.fn(),
  })

  const createMockStream = (currentRequestValue: unknown = null): StreamModel => {
    const currentRequestFn = vi.fn(() => currentRequestValue)
    const durationMsFn = vi.fn(() => 1500)
    const deactivateFn = vi.fn()

    return {
      active: true,
      messages: [],
      startTime: Date.now(),
      begin: vi.fn(),
      start: vi.fn(),
      appendReceived: vi.fn(),
      addSent: vi.fn(),
      currentRequest: currentRequestFn,
      currentMessages: vi.fn(() => []),
      durationMs: durationMsFn,
      deactivate: deactivateFn,
      complete: vi.fn(),
      reset: vi.fn(),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveToHistory when cancelling stream with active request', () => {
    const saveToHistory = vi.fn()
    const currentRequest = { name: 'test', value: 123 }
    const mockStream = createMockStream(currentRequest)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    act(() => {
      result.current.cancelStream()
    })

    expect(saveToHistory).toHaveBeenCalledTimes(1)
    expect(saveToHistory).toHaveBeenCalledWith(
      currentRequest,
      {
        ok: false,
        message: 'Cancelled by user',
        responseTimeMs: 1500,
      }
    )
  })

  it('does not call saveToHistory when no current request', () => {
    const saveToHistory = vi.fn()
    const mockStream = createMockStream(null)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    act(() => {
      result.current.cancelStream()
    })

    expect(saveToHistory).not.toHaveBeenCalled()
  })

  it('calls stream.deactivate when cancelling', () => {
    const saveToHistory = vi.fn()
    const currentRequest = { name: 'test' }
    const mockStream = createMockStream(currentRequest)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    act(() => {
      result.current.cancelStream()
    })

    expect(mockStream.deactivate).toHaveBeenCalledTimes(1)
  })

  it('includes correct duration from stream model', () => {
    const saveToHistory = vi.fn()
    const currentRequest = { name: 'test' }
    const mockStream = createMockStream(currentRequest)
    mockStream.durationMs = vi.fn(() => 3500)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    act(() => {
      result.current.cancelStream()
    })

    expect(saveToHistory).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        responseTimeMs: 3500,
      })
    )
  })

  it('passes complete request object to saveToHistory', () => {
    const saveToHistory = vi.fn()
    const complexRequest = {
      user: { id: 1, name: 'John' },
      filters: ['active', 'verified'],
      limit: 100,
    }
    const mockStream = createMockStream(complexRequest)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    act(() => {
      result.current.cancelStream()
    })

    expect(saveToHistory).toHaveBeenCalledWith(
      complexRequest,
      expect.any(Object)
    )
  })

  it('sets loading to false when cancelling', () => {
    const saveToHistory = vi.fn()
    const currentRequest = { name: 'test' }
    const mockStream = createMockStream(currentRequest)

    const { result } = renderHook(() =>
      useMethodInvocation(
        'Server1',
        mockService,
        mockMethod,
        createMockRequest(),
        createMockResponse(),
        mockStream,
        saveToHistory
      )
    )

    // loading should be false initially
    expect(result.current.loading).toBe(false)

    act(() => {
      result.current.cancelStream()
    })

    expect(result.current.loading).toBe(false)
  })
})
