// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * API Key Authentication Plugin
 * 
 * Simple API key authentication that adds the API key to headers.
 * Supports various header formats commonly used by gRPC services.
 */

import { AuthPlugin, type AuthPluginConfig } from './authPlugin.js';

interface ApiKeyConfig extends AuthPluginConfig {
  apiKey?: string;
  headerName?: string;
  headerPrefix?: string;
}

export class ApiKeyPlugin extends AuthPlugin {
  static override metadata = {
    name: 'api-key',
    description: 'API key authentication via custom headers',
  };

  private apiKey: string | undefined;
  private headerName: string | undefined;
  private headerPrefix: string | undefined;

  constructor(config: ApiKeyConfig = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.headerName = config.headerName;
    this.headerPrefix = config.headerPrefix;
  }

  override async initialize(): Promise<void> {
    this.logger.debug('API key authentication plugin initialized', { headerName: this.headerName });
  }

  override async getHeaders(): Promise<Record<string, string>> {
    if (!this.apiKey) {
      throw new Error('No API key configured');
    }

    const headerValue = this.headerPrefix ? `${this.headerPrefix} ${this.apiKey}` : this.apiKey;

    return {
      [this.headerName ?? 'X-API-Key']: headerValue
    };
  }

  override validateConfig(): import('../../types/index.js').ValidationResult {
    const errors = [];

    if (!this.apiKey) {
      errors.push('API key is required (apiKey config or API_KEY env var)');
    }

    if (!this.headerName) {
      errors.push('Header name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
