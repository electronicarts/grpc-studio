// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ServerStatus } from '@grpc-studio/shared'

export interface ServerConnectionStatus {
  servers: ServerStatus[]
  loading: boolean
}
