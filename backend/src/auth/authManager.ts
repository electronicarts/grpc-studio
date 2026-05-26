// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Auth Manager
 *
 * Owns authentication plugin discovery, initialization, selection, and cleanup.
 * Configuration is supplied by ConfigManager, but plugin lifecycle lives here.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { AuthConfig } from '../config/schemas/appConfigSchema.js';
import { AuthPlugin, type AuthPluginClass } from './plugins/authPlugin.js';
import { authPluginRegistry } from './authPluginRegistry.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NONE_PLUGIN_NAME = 'none';
const authLogger = logger.child({ module: 'auth-manager' });

class AuthManager {
  async initialize(authConfig: AuthConfig): Promise<void> {
    const pluginName = this.resolveConfiguredPlugin(authConfig);

    await authPluginRegistry.cleanupAll();
    await this.loadPluginModules();
    await this.initializeConfiguredPlugin(pluginName, authConfig);

  }

  getCurrentPlugin(): AuthPlugin | null {
    return authPluginRegistry.getActive();
  }

  getCurrentPluginName(): string {
    return authPluginRegistry.getActiveName() ?? NONE_PLUGIN_NAME;
  }

  async cleanup(): Promise<void> {
    await authPluginRegistry.cleanupAll();
  }

  private async loadPluginModules(): Promise<void> {
    const pluginsDir = path.resolve(__dirname, 'plugins');
    const files = fs.readdirSync(pluginsDir).filter(
      file => (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.d.ts') &&
        !file.startsWith('authPlugin.')
    );

    for (const file of files) {
      const pluginModule = await import(pathToFileURL(path.join(pluginsDir, file)).href) as Record<string, unknown>;
      this.registerPluginClasses(pluginModule);
    }
  }

  private registerPluginClasses(pluginModule: Record<string, unknown>): void {
    for (const exportedValue of Object.values(pluginModule)) {
      if (isAuthPluginClass(exportedValue)) {
        authPluginRegistry.registerClass(exportedValue);
      }
    }
  }

  private resolveConfiguredPlugin(authConfig: AuthConfig): string {
    const enabledPlugins = this.getEnabledPluginNames(authConfig);

    if (enabledPlugins.length > 1) {
      throw new Error(`Only one authentication plugin can be enabled at a time. Enabled plugins: ${enabledPlugins.join(', ')}`);
    }

    if (enabledPlugins.length === 0) {
      authLogger.warn(`No outbound authentication plugin configured; using '${NONE_PLUGIN_NAME}'. If the target gRPC server requires auth, configure exactly one auth plugin.`);
      return NONE_PLUGIN_NAME;
    }

    return enabledPlugins[0];
  }

  private getEnabledPluginNames(authConfig: AuthConfig): string[] {
    return Object.entries(authConfig.plugins ?? {})
      .filter(([, pluginDef]) => pluginDef.enabled === true)
      .map(([pluginName]) => pluginName);
  }

  private async initializeConfiguredPlugin(pluginName: string, authConfig: AuthConfig): Promise<void> {
    const pluginConfig = pluginName === NONE_PLUGIN_NAME
      ? {}
      : authConfig.plugins?.[pluginName]?.config ?? {};

    await authPluginRegistry.initializePlugin(pluginName, pluginConfig);
  }
}

function isAuthPluginClass(value: unknown): value is AuthPluginClass {
  return typeof value === 'function' && value.prototype instanceof AuthPlugin;
}

const authManager = new AuthManager();
export default authManager;
export { AuthManager };
