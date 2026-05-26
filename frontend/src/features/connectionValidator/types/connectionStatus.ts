// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface ConnectionStatus {
  connected: boolean
  targetServer: string
  servicesCount: number
  error: string | null
  loading: boolean
}
