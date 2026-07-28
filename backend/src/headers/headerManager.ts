// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { type RequestMetadata } from '@grpc-studio/shared'
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
   * Build the full set of outbound gRPC metadata. User-supplied request
   * metadata is applied first, then auth-plugin and trusted user headers
   * overwrite any conflicting keys so the UI cannot spoof identity/auth.
   *
   * `requestMetadata` is expected to be already sanitized at the request
   * boundary (the HTTP controller and the WebSocket protocol parser both run
   * `sanitizeRequestMetadata` on ingress so they can reject bad input), so it is
   * trusted here as-is.
   */
  async getOutboundHeaders(
    userContext: UserContext | null = null,
    requestMetadata: RequestMetadata | null = null
  ): Promise<Record<string, string>> {
    return {
      ...(requestMetadata ?? {}),
      ...(await this.getAuthHeaders()),
      ...this.getUserHeaders(userContext),
    }
  }
}

const headerManager = new HeaderManager()
export default headerManager
