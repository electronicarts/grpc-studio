// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useCallback } from 'react'
import { GrpcService, GrpcMethod, ApiServer } from '../../../types/grpc'
import { useSchemas } from '../../schemaLoader'
import { useShareableLink } from './useShareableLink'
import type { PendingShare, ServiceSelectionResult } from '../types'

// ---------------------------------------------------------------------------
// Manages service/method selection state. Services come from React Query.
// ---------------------------------------------------------------------------

export function useServiceSelection(): ServiceSelectionResult {
  const { servers, services } = useSchemas()

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<GrpcService | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<GrpcMethod | null>(null)
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null)

  // A restored share selects its method (so the sidebar reflects it) and is held
  // as pending until the tab system opens it and calls consumeShare().
  const restoreShare = useCallback((share: PendingShare) => {
    setSelectedTarget(share.target)
    setSelectedService(share.service)
    setSelectedMethod(share.method)
    setPendingShare(share)
  }, [])

  const consumeShare = useCallback(() => setPendingShare(null), [])

  useShareableLink(servers, services, restoreShare)

  const selectService = useCallback((service: GrpcService, server: ApiServer) => {
    // Server is now passed directly from the UI, no need to search
    setSelectedTarget(server.name)
    setSelectedService(service)
    setSelectedMethod(null)
  }, [])

  const selectMethod = useCallback((method: GrpcMethod, service: GrpcService, server: ApiServer) => {
    // Server is passed directly to ensure correct target
    setSelectedTarget(server.name)
    setSelectedMethod(method)
    setSelectedService(service)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTarget(null)
    setSelectedService(null)
    setSelectedMethod(null)
  }, [])

  return {
    servers,
    services,
    selectedTarget,
    selectedService,
    selectedMethod,
    pendingShare,
    consumeShare,
    selectService,
    selectMethod,
    clearSelection,
  }
}
