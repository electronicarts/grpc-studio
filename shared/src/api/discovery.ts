// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { MethodKind } from './methodKind.js'

/**
 * POST /api/grpc/discover
 * Request body: none.
 * Response body: services and methods discovered from gRPC reflection.
 */
export type DiscoveryRequest = undefined

export interface ApiMethod {
  name: string
  inputType: string
  outputType: string
  kind: MethodKind
}

export interface ApiService {
  name?: string
  fullName: string
  methods: ApiMethod[]
}

export interface DiscoveryResponse {
  services: ApiService[]
}
