// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { GrpcService, GrpcMethod, ApiServer } from '../../../types/grpc'
import type { RequestMetadata } from '@grpc-studio/shared'

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ServiceExplorerProps {
  selectedTarget: string | null
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  onServiceSelect: (service: GrpcService, server: ApiServer) => void
  onMethodSelect: (method: GrpcMethod, service: GrpcService, server: ApiServer) => void
  onServerToggle?: () => void
}

export interface ServiceItemProps {
  service: GrpcService
  isSelected: boolean
  isExpanded: boolean
  onToggle: (service: GrpcService) => void
  children?: React.ReactNode
}

export interface MethodItemProps {
  method: GrpcMethod
  service: GrpcService
  server: ApiServer
  isSelected: boolean
  onSelect: (method: GrpcMethod, service: GrpcService, server: ApiServer) => void
}

// ---------------------------------------------------------------------------
// Streaming type
// ---------------------------------------------------------------------------

export type StreamingType = 'Unary' | 'Server Stream' | 'Client Stream' | 'Bidirectional Stream'

// ---------------------------------------------------------------------------
// Selection hook
// ---------------------------------------------------------------------------

export interface ServiceSelectionResult {
  servers: ApiServer[]
  services: GrpcService[]
  selectedTarget: string | null
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  sharedRequestBody: Record<string, unknown> | null
  sharedMetadata: RequestMetadata | null
  selectService: (service: GrpcService, server: ApiServer) => void
  selectMethod: (method: GrpcMethod, service: GrpcService, server: ApiServer) => void
  clearSelection: () => void
}
