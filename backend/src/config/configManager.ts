// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Configuration Manager for gRPC Studio
 */

import type { PublicConfig } from '@grpc-studio/shared';
import { loadConfig } from './configLoader.js';
import type {
  AppConfig,
  AuthConfig,
  CacheConfig,
  CertificateConfig,
  ClientConfig,
  HealthConfig,
  ServerConfig,
  ObservabilityConfig,
} from './schemas/appConfigSchema.js';

class ConfigManager {
  private appConfig: AppConfig | null = null;

  constructor(private readonly loadConfigFn: () => AppConfig = loadConfig) {}

  getServerConfig(): ServerConfig {
    return this.config.server;
  }

  getClientConfig(): ClientConfig {
    return this.config.client;
  }

  getAuthConfig(): AuthConfig {
    return this.config.auth;
  }

  getCertificateConfig(): CertificateConfig {
    return this.config.certificate;
  }

  getHealthConfig(): HealthConfig {
    return this.config.health;
  }

  getCacheConfig(): CacheConfig {
    return this.config.cache;
  }

  getObservabilityConfig(): ObservabilityConfig {
    return this.config.observability || { enabled: false };
  }

  getPublicConfig(): PublicConfig {
    const { mode, target } = this.config.client;
    return { client: { mode, target } };
  }

  private get config(): AppConfig {
    if (!this.appConfig) {
      this.appConfig = this.loadConfigFn();
    }
    return this.appConfig;
  }
}

// Create and export singleton instance
const configManager = new ConfigManager();
export default configManager;
