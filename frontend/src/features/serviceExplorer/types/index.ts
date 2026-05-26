// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { GrpcService, GrpcMethod } from '../../../types/grpc'

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ServiceExplorerProps {
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  onServiceSelect: (service: GrpcService) => void
  onMethodSelect: (method: GrpcMethod, service: GrpcService) => void
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
  isSelected: boolean
  onSelect: (method: GrpcMethod, service: GrpcService) => void
}

// ---------------------------------------------------------------------------
// Streaming type
// ---------------------------------------------------------------------------

export type StreamingType = 'Unary' | 'Server Stream' | 'Client Stream' | 'Bidirectional Stream'

// ---------------------------------------------------------------------------
// Selection hook
// ---------------------------------------------------------------------------

export interface ServiceSelectionResult {
  services: GrpcService[]
  selectedService: GrpcService | null
  selectedMethod: GrpcMethod | null
  sharedRequestBody: Record<string, unknown> | null
  selectService: (service: GrpcService) => void
  selectMethod: (method: GrpcMethod, service: GrpcService) => void
  clearSelection: () => void
}
