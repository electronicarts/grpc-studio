// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useRef } from 'react'
import { GrpcService, GrpcMethod, ApiServer } from '../../../types/grpc'
import { parseShareableUrl, clearShareFragment, SharedRequestState } from '../../../utils/shareableLink'

// ---------------------------------------------------------------------------
// Restore shareable link state once services are available
// ---------------------------------------------------------------------------

interface ShareableLinkResult {
  sharedRequestBody: Record<string, unknown> | null
}

export function useShareableLink(
  servers: ApiServer[],
  services: GrpcService[],
  setSelectedService: (s: GrpcService) => void,
  setSelectedMethod: (m: GrpcMethod) => void,
  setSharedRequestBody: (body: Record<string, unknown> | null) => void,
  setSelectedTarget: (target: string) => void,
): ShareableLinkResult {
  const pendingShare = useRef<SharedRequestState | null>(parseShareableUrl())

  useEffect(() => {
    const share = pendingShare.current
    if (!share || services.length === 0) return

    const service = services.find(s => s.fullName === share.s)
    if (!service) return

    const method = service.methods.find(m => m.name === share.m)
    if (!method) return

    // Infer the target by finding which server has this service
    const server = servers.find(srv => srv.services.some(svc => svc.fullName === service.fullName))

    if (!server) return

    // Set target first so tab system has all required data
    setSelectedTarget(server.name)
    setSelectedService(service)
    setSelectedMethod(method)
    setSharedRequestBody(share.r)
    pendingShare.current = null
    clearShareFragment()
  }, [servers, services, setSelectedService, setSelectedMethod, setSharedRequestBody, setSelectedTarget])

  return { sharedRequestBody: null }
}
