// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { sanitizeRequestMetadata, type RequestMetadata } from '@grpc-studio/shared'
import authManager from '../auth/authManager.js'
import type { UserContext } from '../types/index.js'

interface AuthHeaderPlugin {
  getHeaders(): Promise<Record<string, string>>
}

interface AuthHeaderProvider {
  getCurrentPlugin(): AuthHeaderPlugin | null
}

export class HeaderManager {
  constructor(private readonly authHeaderProvider: AuthHeaderProvider = authManager) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    const authPlugin = this.authHeaderProvider.getCurrentPlugin()
    return authPlugin ? authPlugin.getHeaders() : {}
  }

  getUserHeaders(userContext: UserContext | null = null): Record<string, string> {
    const headers: Record<string, string> = {}
    if (userContext?.userId) headers['x-user-id'] = userContext.userId
    if (userContext?.userEmail) headers['x-user-email'] = userContext.userEmail
    if (userContext?.userName) headers['x-user-name'] = userContext.userName
    return headers
  }

  /**
   * Normalize user-supplied request metadata into outbound headers. Invalid
   * entries are dropped rather than throwing; callers that need to surface
   * validation errors should validate before invoking the gRPC call.
   */
  getRequestMetadataHeaders(requestMetadata: RequestMetadata | null = null): Record<string, string> {
    return sanitizeRequestMetadata(requestMetadata).metadata
  }

  /**
   * Build the full set of outbound gRPC metadata. User-supplied request
   * metadata is applied first, then auth-plugin and trusted user headers
   * overwrite any conflicting keys so the UI cannot spoof identity/auth.
   */
  async getOutboundHeaders(
    userContext: UserContext | null = null,
    requestMetadata: RequestMetadata | null = null
  ): Promise<Record<string, string>> {
    return {
      ...this.getRequestMetadataHeaders(requestMetadata),
      ...(await this.getAuthHeaders()),
      ...this.getUserHeaders(userContext),
    }
  }
}

const headerManager = new HeaderManager()
export default headerManager
