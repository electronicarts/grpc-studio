// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServiceSelection } from '../useServiceDiscovery'
import { schemaCache } from '../../../schemaLoader/lib/schemaCache'
import type { GrpcService, GrpcMethod } from '../../../../types/grpc'

// Mock the schemaCache and shareableLink hook
vi.mock('../../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    subscribe: vi.fn(() => () => {}),
    getServices: vi.fn(() => []),
  },
}))

vi.mock('../useShareableLink', () => ({
  useShareableLink: vi.fn(),
}))

const mockService: GrpcService = {
  name: 'petstore.PetStore',
  fullName: 'petstore.PetStore',
  methods: [],
}

const mockMethod: GrpcMethod = {
  name: 'GetPet',
  fullName: 'petstore.PetStore/GetPet',
  clientStreaming: false,
  serverStreaming: false,
  inputType: 'GetPetRequest',
  outputType: 'Pet',
}

describe('useServiceSelection', () => {
  beforeEach(() => {
    vi.mocked(schemaCache.getServices).mockReturnValue([])
  })

  it('starts with no selection', () => {
    const { result } = renderHook(() => useServiceSelection())
    expect(result.current.selectedService).toBeNull()
    expect(result.current.selectedMethod).toBeNull()
    expect(result.current.sharedRequestBody).toBeNull()
  })

  it('selectService sets service and clears method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectService(mockService) })
    expect(result.current.selectedService).toBe(mockService)
    expect(result.current.selectedMethod).toBeNull()
  })

  it('selectMethod sets both service and method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectMethod(mockMethod, mockService) })
    expect(result.current.selectedService).toBe(mockService)
    expect(result.current.selectedMethod).toBe(mockMethod)
  })

  it('clearSelection resets both service and method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectMethod(mockMethod, mockService) })
    act(() => { result.current.clearSelection() })
    expect(result.current.selectedService).toBeNull()
    expect(result.current.selectedMethod).toBeNull()
  })

  it('selectService clears sharedRequestBody', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectService(mockService) })
    expect(result.current.sharedRequestBody).toBeNull()
  })

  it('returns services from schemaCache', () => {
    vi.mocked(schemaCache.getServices).mockReturnValue([mockService])
    const { result } = renderHook(() => useServiceSelection())
    expect(result.current.services).toEqual([mockService])
  })
})
