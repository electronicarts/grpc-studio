// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /
 * Request body: none.
 * Response body: backend API identity payload.
 */
export type RootRequest = undefined

export interface RootResponse {
  name: string
  version: string
  status: 'running'
}
