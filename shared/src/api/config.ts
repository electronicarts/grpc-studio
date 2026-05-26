// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /api/grpc/config
 * Request body: none.
 * Response body: public frontend-safe backend configuration.
 */
export type ConfigRequest = undefined

export interface PublicConfig {
  client: {
    mode: string
    target: {
      host: string
      port: number
    }
  }
}

export interface ConfigResponse {
  config: PublicConfig
}
