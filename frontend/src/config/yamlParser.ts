// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import yaml from 'js-yaml';
import type { FrontendConfig } from './types';
import { createLogger } from '@/utils/debugLogger';

const logger = createLogger('Config:YAML');

/**
 * Parse YAML text into a typed FrontendConfig object.
 * Returns null if parsing fails.
 */
export const parseYamlConfig = (yamlText: string): FrontendConfig | null => {
  try {
    const raw = yaml.load(yamlText) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') {
      throw new Error('YAML did not parse into an object');
    }

    // Parse auth configuration
    let authConfig: FrontendConfig['auth'] = undefined;
    if (raw.auth) {
      const a = raw.auth as Record<string, unknown>;
      authConfig = {
        enabled: Boolean(a.enabled),
        provider: String(a.provider ?? ''),
      };
      if (a.enabled && a.provider === 'entra-id' && a.entraId) {
        const e = a.entraId as Record<string, unknown>;
        authConfig.entraId = {
          tenantId: String(e.tenantId ?? ''),
          clientId: String(e.clientId ?? ''),
          redirectUri: e.redirectUri ? String(e.redirectUri) : undefined,
          scopes: Array.isArray(e.scopes) ? e.scopes.map(String) : undefined,
          cloud: e.cloud ? String(e.cloud) : 'public',
        };
      }
    }

    const api = raw.api as Record<string, unknown> | undefined;
    const endpoints = api?.endpoints as Record<string, unknown> | undefined;
    return {
      api: {
        baseUrl: String(api?.baseUrl ?? ''),
        endpoints: {
          config: String(endpoints?.config ?? '/api/grpc/config'),
          discover: String(endpoints?.discover ?? '/api/grpc/discover'),
          invoke: String(endpoints?.invoke ?? '/api/grpc/invoke'),
          descriptorSet: String(endpoints?.descriptorSet ?? '/api/grpc/descriptor-set'),
          status: String(endpoints?.status ?? '/api/grpc/status'),
          health: String(endpoints?.health ?? '/health'),
        },
        timeout: Number(api?.timeout ?? 30000),
        websocketTimeout: api?.websocketTimeout != null ? Number(api.websocketTimeout) : undefined,
      },
      auth: authConfig,
    };
  } catch (error) {
    logger.error('YAML parsing failed:', error);
    return null;
  }
};
