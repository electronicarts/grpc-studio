// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { AuthPlugin, type AuthPluginConfig } from './authPlugin.js';
import type { ValidationResult } from '../../types/index.js';

interface BearerTokenConfig extends AuthPluginConfig {
  token?: string;
}

export class BearerTokenPlugin extends AuthPlugin {
  static override metadata = {
    name: 'bearer-token',
    description: 'Bearer token authentication via Authorization header',
  };

  private token: string | null;

  constructor(config: BearerTokenConfig = {}) {
    super(config);
    this.token = config.token ?? null;
  }

  override async initialize(): Promise<void> {
    this.logger.debug('Bearer token authentication plugin initialized');
  }

  override async getHeaders(): Promise<Record<string, string>> {
    if (!this.token) throw new Error('No bearer token available');
    return { Authorization: `Bearer ${this.token}` };
  }

  override validateConfig(): ValidationResult {
    const errors: string[] = [];
    if (!this.token) errors.push('token must be configured');
    return { isValid: errors.length === 0, errors };
  }
}
