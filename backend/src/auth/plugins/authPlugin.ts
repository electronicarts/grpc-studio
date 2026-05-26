// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { PluginMetadata, ValidationResult } from '../../types/index.js';
import logger, { type ChildLogger } from '../../utils/logger.js';

export interface AuthPluginConfig extends Record<string, unknown> {
  logger?: ChildLogger;
}

export abstract class AuthPlugin {
  static metadata: PluginMetadata = { name: '', description: '' };

  protected config: AuthPluginConfig;
  readonly name: string;
  protected logger: ChildLogger;

  constructor(config: AuthPluginConfig = {}) {
    if (new.target === AuthPlugin) {
      throw new Error('AuthPlugin is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = (this.constructor as typeof AuthPlugin).metadata.name || this.constructor.name;
    this.logger = config.logger ?? logger.child({ module: 'auth-plugin', plugin: this.name });
  }

  abstract initialize(): Promise<void>;
  abstract getHeaders(): Promise<Record<string, string>>;

  validateConfig(): ValidationResult { return { isValid: true, errors: [] }; }

  async cleanup(): Promise<void> {}
}

export type AuthPluginClass = (new (config: AuthPluginConfig) => AuthPlugin) & {
  metadata: PluginMetadata;
};
