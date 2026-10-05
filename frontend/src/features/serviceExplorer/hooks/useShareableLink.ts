// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useRef } from 'react'
import { GrpcService, ApiServer } from '../../../types/grpc'
import { parseShareableUrl, clearShareFragment, SharedRequestState } from '../../../utils/shareableLink'
import type { PendingShare } from '../types'

// ---------------------------------------------------------------------------
// Restore shareable link state once services are available
// ---------------------------------------------------------------------------

/**
 * Reads the share fragment from the URL on mount and, once the shared
 * service/method has been discovered, hands it to `onRestore` exactly once.
 */
export function useShareableLink(
  servers: ApiServer[],
  services: GrpcService[],
  onRestore: (share: PendingShare) => void,
): void {
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

    onRestore({ target: server.name, service, method, requestBody: share.r, metadata: share.md ?? null })
    pendingShare.current = null
    clearShareFragment()
  }, [servers, services, onRestore])
}
