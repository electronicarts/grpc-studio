// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * No Authentication Plugin
 * 
 * A simple plugin that provides no authentication headers.
 * Useful for testing or connecting to servers that don't require authentication.
 */

import { AuthPlugin } from './authPlugin.js';

export class NoAuthPlugin extends AuthPlugin {
  static override metadata = {
    name: 'none',
    description: "No authentication - for servers that don't require authentication",
  };

  override async initialize(): Promise<void> {
    this.logger.debug('No authentication plugin initialized');
  }

  override async getHeaders(): Promise<Record<string, string>> {
    return {};
  }

  /**
   * No configuration needed, always valid
   */
  override validateConfig() {
    return {
      isValid: true,
      errors: []
    };
  }
}
