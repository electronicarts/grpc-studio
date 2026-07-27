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
import type { TargetConfig } from './schemas/clientSchema.js';

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
    // Public config is empty in multi-server mode
    // Server details are available via discovery endpoint
    return {};
  }

  /**
   * Get all configured targets.
   * @returns Array of target configs
   */
  getTargets(): TargetConfig[] {
    return this.config.client.targets;
  }

  /**
   * Get a specific target by name
   */
  getTarget(name: string): TargetConfig | undefined {
    return this.getTargets().find(t => t.name === name);
  }

  /**
   * Reload config from disk (clears cache and re-reads config files)
   */
  reload(): void {
    this.appConfig = null;
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
