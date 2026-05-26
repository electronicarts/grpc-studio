// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { FrontendConfig } from './types';

// Configuration state — starts null, must be loaded before use
let config: FrontendConfig | null = null;

/**
 * Store the loaded configuration.
 */
export const setConfig = (loaded: FrontendConfig): void => {
  config = loaded;
};

/**
 * Get current configuration.
 * Throws if configuration has not been loaded.
 */
export const getConfig = (): FrontendConfig => {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
};

/**
 * Check if configuration has been loaded.
 */
export const isConfigLoaded = (): boolean => {
  return config !== null;
};
