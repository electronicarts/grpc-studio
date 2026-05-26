// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import {
  AuthPlugin,
  type AuthPluginClass,
  type AuthPluginConfig,
} from './plugins/authPlugin.js';
import logger, { type ChildLogger } from '../utils/logger.js';

class AuthPluginRegistry {
  private plugins: Map<string, AuthPlugin>;
  private pluginClasses: Map<string, AuthPluginClass>;
  private activePlugin: string | null;
  private logger: ChildLogger;

  constructor(options: { logger?: ChildLogger } = {}) {
    this.plugins = new Map();
    this.pluginClasses = new Map();
    this.activePlugin = null;
    this.logger = options.logger ?? logger.child({ module: 'auth-plugin-registry' });
  }

  registerClass(PluginClass: AuthPluginClass): void {
    if (!(PluginClass.prototype instanceof AuthPlugin)) {
      throw new Error('Plugin class must extend AuthPlugin');
    }
    const { name, description } = PluginClass.metadata;
    if (!name || !description) {
      throw new Error('Plugin class must define a static metadata object with name and description');
    }
    this.pluginClasses.set(name, PluginClass);
    this.logger.debug('Registered authentication plugin class', { plugin: name });
  }

  async initializePlugin(name: string, config: AuthPluginConfig = {}): Promise<AuthPlugin> {
    this.ensureOnlyInitializedPlugin(name);
    const PluginClass = this.pluginClasses.get(name);
    if (!PluginClass) throw new Error(`Plugin class '${name}' not registered`);
    const plugin = new PluginClass({ ...config, logger: this.logger.child({ plugin: name }) });
    const v = plugin.validateConfig();
    if (!v.isValid) throw new Error(`Plugin validation failed: ${v.errors.join(', ')}`);
    await plugin.initialize();
    this.plugins.set(name, plugin);
    this.activePlugin = name;
    this.logger.debug('Initialized authentication plugin', { plugin: name });
    return plugin;
  }

  getActive(): AuthPlugin | null { return this.activePlugin ? (this.plugins.get(this.activePlugin) ?? null) : null; }
  getActiveName(): string | null { return this.activePlugin; }

  async cleanupAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      try {
        await plugin.cleanup();
      } catch (error) {
        this.logger.error('Failed to cleanup plugin', { plugin: plugin.name, error: error instanceof Error ? error.message : String(error) });
      }
    }
    this.plugins.clear();
    this.activePlugin = null;
    this.logger.debug('Cleaned up all authentication plugins');
  }

  private ensureOnlyInitializedPlugin(name: string): void {
    if (this.plugins.size > 0 && !this.plugins.has(name)) {
      throw new Error(`Only one authentication plugin can be initialized at a time. Active plugin: ${this.activePlugin ?? 'unknown'}`);
    }
  }
}

export const authPluginRegistry = new AuthPluginRegistry();
