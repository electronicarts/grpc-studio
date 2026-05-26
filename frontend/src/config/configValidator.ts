// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { FrontendConfig } from './types';
import { createLogger } from '@/utils/debugLogger';

const logger = createLogger('Config');

/**
 * Validate that a parsed FrontendConfig has all required fields.
 * Throws on invalid configuration.
 */
export const validateConfig = (config: FrontendConfig): void => {
  // Allow empty baseUrl for relative URLs (nginx proxy configuration)
  if (config.api.baseUrl && !config.api.baseUrl.startsWith('http') && !config.api.baseUrl.startsWith('/')) {
    throw new Error('api.baseUrl must be a valid HTTP/HTTPS URL or start with / for relative URLs');
  }

  if (config.api.timeout <= 0) {
    throw new Error('api.timeout must be a positive number');
  }

  // Validate required endpoint paths are present
  const requiredEndpoints = ['config', 'discover', 'invoke', 'descriptorSet', 'status', 'health'] as const;
  for (const ep of requiredEndpoints) {
    if (!config.api.endpoints[ep]) {
      throw new Error(`api.endpoints.${ep} is required but missing or empty`);
    }
  }

  logger.info('Configuration validation passed');
};
