// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback, useSyncExternalStore } from 'react'
import { GrpcService, GrpcMethod } from '../../../types/grpc'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'
import { useShareableLink } from './useShareableLink'
import type { ServiceSelectionResult } from '../types'

// ---------------------------------------------------------------------------
// Manages service/method selection state. Services come from schemaCache.
// ---------------------------------------------------------------------------

export function useServiceSelection(): ServiceSelectionResult {
  const services = useSyncExternalStore(
    (cb) => schemaCache.subscribe(cb),
    () => schemaCache.getServices()
  )

  const [selectedService, setSelectedService] = useState<GrpcService | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<GrpcMethod | null>(null)
  const [sharedRequestBody, setSharedRequestBody] = useState<Record<string, unknown> | null>(null)

  useShareableLink(services, setSelectedService, setSelectedMethod, setSharedRequestBody)

  const selectService = useCallback((service: GrpcService) => {
    setSelectedService(service)
    setSelectedMethod(null)
    setSharedRequestBody(null)
  }, [])

  const selectMethod = useCallback((method: GrpcMethod, service: GrpcService) => {
    setSelectedMethod(method)
    setSelectedService(service)
    setSharedRequestBody(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedService(null)
    setSelectedMethod(null)
    setSharedRequestBody(null)
  }, [])

  return {
    services,
    selectedService,
    selectedMethod,
    sharedRequestBody,
    selectService,
    selectMethod,
    clearSelection,
  }
}
