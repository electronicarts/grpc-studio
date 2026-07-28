// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback } from 'react'
import type { RequestMetadata } from '@grpc-studio/shared'
import { GrpcService, GrpcMethod, ApiServer } from '../../../types/grpc'
import { useSchemas } from '../../schemaLoader'
import { useShareableLink } from './useShareableLink'
import type { ServiceSelectionResult } from '../types'

// ---------------------------------------------------------------------------
// Manages service/method selection state. Services come from React Query.
// ---------------------------------------------------------------------------

export function useServiceSelection(): ServiceSelectionResult {
  const { servers, services } = useSchemas()

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<GrpcService | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<GrpcMethod | null>(null)
  const [sharedRequestBody, setSharedRequestBody] = useState<Record<string, unknown> | null>(null)
  const [sharedMetadata, setSharedMetadata] = useState<RequestMetadata | null>(null)

  useShareableLink(
    servers, services, setSelectedService, setSelectedMethod,
    setSharedRequestBody, setSharedMetadata, setSelectedTarget,
  )

  const selectService = useCallback((service: GrpcService, server: ApiServer) => {
    // Server is now passed directly from the UI, no need to search
    setSelectedTarget(server.name)
    setSelectedService(service)
    setSelectedMethod(null)
    setSharedRequestBody(null)
    setSharedMetadata(null)
  }, [])

  const selectMethod = useCallback((method: GrpcMethod, service: GrpcService, server: ApiServer) => {
    // Server is passed directly to ensure correct target
    setSelectedTarget(server.name)
    setSelectedMethod(method)
    setSelectedService(service)
    setSharedRequestBody(null)
    setSharedMetadata(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTarget(null)
    setSelectedService(null)
    setSelectedMethod(null)
    setSharedRequestBody(null)
    setSharedMetadata(null)
  }, [])

  return {
    servers,
    services,
    selectedTarget,
    selectedService,
    selectedMethod,
    sharedRequestBody,
    sharedMetadata,
    selectService,
    selectMethod,
    clearSelection,
  }
}
