// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /api/grpc/config
 * Request body: none.
 * Response body: public frontend-safe backend configuration.
 */
export type ConfigRequest = undefined

export interface PublicConfig {
  // Public config no longer exposes client details in multi-server mode
  // Server information is available via the discovery endpoint
}

export interface ConfigResponse {
  config: PublicConfig
}
