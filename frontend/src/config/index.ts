// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

// Configuration loader — fetch, parse, validate, store.

import { createLogger } from '@/utils/debugLogger';
import type { FrontendConfig } from './types';
import { parseYamlConfig } from './yamlParser';
import { validateConfig } from './configValidator';
import { setConfig } from './configState';

const logger = createLogger('Config');

/**
 * Load configuration from /config/frontend.yaml.
 * Pure data loading — no side effects beyond storing the config.
 */
export const loadConfig = async (): Promise<FrontendConfig> => {
  try {
    logger.info('Loading frontend configuration from /config/frontend.yaml...');

    const response = await fetch('/config/frontend.yaml');

    if (!response.ok) {
      throw new Error(`Configuration not found: HTTP ${response.status} ${response.statusText}`);
    }

    const yamlText = await response.text();

    if (!yamlText.trim()) {
      throw new Error('Configuration file is empty');
    }

    const parsedConfig = parseYamlConfig(yamlText);

    if (!parsedConfig) {
      throw new Error('Failed to parse configuration YAML');
    }

    validateConfig(parsedConfig);
    setConfig(parsedConfig);
    logger.info('Configuration loaded successfully');

    return parsedConfig;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
    logger.error('❌ FATAL: Failed to load configuration:', errorMessage);
    throw new Error(`Configuration loading failed: ${errorMessage}`);
  }
};

// Re-export public API
export type { FrontendConfig } from './types';
export { getConfig, isConfigLoaded } from './configState';
export { buildApiUrl, buildCustomApiUrl } from './urlBuilder';
