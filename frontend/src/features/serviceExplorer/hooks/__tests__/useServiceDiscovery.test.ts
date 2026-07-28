// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useServiceSelection } from '../useServiceDiscovery'
import { useSchemas } from '../../../schemaLoader'
import type { GrpcService, GrpcMethod, ApiServer } from '../../../../types/grpc'
import { MethodKind } from '@grpc-studio/shared'

// Mock the schema source and shareableLink hook
vi.mock('../../../schemaLoader', () => ({
  useSchemas: vi.fn(),
}))

vi.mock('../useShareableLink', () => ({
  useShareableLink: vi.fn(),
}))

function mockServices(services: GrpcService[]) {
  vi.mocked(useSchemas).mockReturnValue({
    servers: [],
    services,
    loading: false,
    error: null,
    lastFetchedAt: null,
  })
}

const mockServer1: ApiServer = {
  name: 'Server1',
  target: 'localhost:50051',
  services: [],
}

const mockServer2: ApiServer = {
  name: 'Server2',
  target: 'localhost:50052',
  services: [],
}

const mockService: GrpcService = {
  name: 'petstore.PetStore',
  fullName: 'petstore.PetStore',
  methods: [],
}

const mockMethod: GrpcMethod = {
  name: 'GetPet',
  fullName: 'petstore.PetStore/GetPet',
  kind: MethodKind.UNARY,
  inputType: 'GetPetRequest',
  outputType: 'Pet',
}

describe('useServiceSelection', () => {
  beforeEach(() => {
    mockServices([])
  })

  it('starts with no selection', () => {
    const { result } = renderHook(() => useServiceSelection())
    expect(result.current.selectedService).toBeNull()
    expect(result.current.selectedMethod).toBeNull()
    expect(result.current.sharedRequestBody).toBeNull()
    expect(result.current.sharedMetadata).toBeNull()
  })

  it('selectService sets service and clears method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectService(mockService, mockServer1) })
    expect(result.current.selectedService).toBe(mockService)
    expect(result.current.selectedMethod).toBeNull()
  })

  it('selectMethod sets both service and method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectMethod(mockMethod, mockService, mockServer1) })
    expect(result.current.selectedService).toBe(mockService)
    expect(result.current.selectedMethod).toBe(mockMethod)
  })

  it('clearSelection resets both service and method', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectMethod(mockMethod, mockService, mockServer1) })
    act(() => { result.current.clearSelection() })
    expect(result.current.selectedService).toBeNull()
    expect(result.current.selectedMethod).toBeNull()
  })

  it('selectService clears sharedRequestBody', () => {
    const { result } = renderHook(() => useServiceSelection())
    act(() => { result.current.selectService(mockService, mockServer1) })
    expect(result.current.sharedRequestBody).toBeNull()
  })

  it('returns services from the schema source', () => {
    mockServices([mockService])
    const { result } = renderHook(() => useServiceSelection())
    expect(result.current.services).toEqual([mockService])
  })

  describe('server context propagation', () => {
    it('sets target from passed server on selectService', () => {
      const { result } = renderHook(() => useServiceSelection())
      act(() => { result.current.selectService(mockService, mockServer1) })
      expect(result.current.selectedTarget).toBe('Server1')
      expect(result.current.selectedService).toBe(mockService)
    })

    it('updates target when selecting service from different server', () => {
      const { result } = renderHook(() => useServiceSelection())

      act(() => { result.current.selectService(mockService, mockServer1) })
      expect(result.current.selectedTarget).toBe('Server1')

      act(() => { result.current.selectService(mockService, mockServer2) })
      expect(result.current.selectedTarget).toBe('Server2')
    })

    it('sets target from passed server on selectMethod', () => {
      const { result } = renderHook(() => useServiceSelection())
      act(() => { result.current.selectMethod(mockMethod, mockService, mockServer1) })
      expect(result.current.selectedTarget).toBe('Server1')
    })

    it('updates target when selecting method from different server', () => {
      const { result } = renderHook(() => useServiceSelection())

      act(() => { result.current.selectMethod(mockMethod, mockService, mockServer1) })
      expect(result.current.selectedTarget).toBe('Server1')

      act(() => { result.current.selectMethod(mockMethod, mockService, mockServer2) })
      expect(result.current.selectedTarget).toBe('Server2')
    })

    it('clears target on clearSelection', () => {
      const { result } = renderHook(() => useServiceSelection())

      act(() => { result.current.selectMethod(mockMethod, mockService, mockServer1) })
      expect(result.current.selectedTarget).toBe('Server1')

      act(() => { result.current.clearSelection() })
      expect(result.current.selectedTarget).toBeNull()
    })
  })
})
