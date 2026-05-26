// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createLogger } from '@/utils/debugLogger';
import type { YamlAuthConfig } from '../types';
import type { EntraIdConfig } from '../types';
import { setAuthState } from '../stores/authState';
import { initializeEntraId } from './entra/entraId';

const logger = createLogger('Auth');

/**
 * Initialize the auth provider selected in the YAML config.
 * Add new providers by adding a case here and a file in providers/.
 */
export async function initializeAuthFromYaml(yamlAuth?: YamlAuthConfig): Promise<void> {
  if (!yamlAuth?.enabled) {
    logger.info('SSO authentication disabled');
    return;
  }

  switch (yamlAuth.provider) {
    case 'entra-id': {
      const config = mapYamlToEntraIdConfig(yamlAuth);
      if (!config) {
        logger.info('Entra ID not configured');
        return;
      }
      const result = await initializeEntraId(config);
      setAuthState(result.config, result.msalInstance);
      break;
    }
    // Future providers:
    // case 'okta': { const config = mapYamlToOktaConfig(yamlAuth); ... }
    // case 'auth0': { const config = mapYamlToAuth0Config(yamlAuth); ... }
    default:
      logger.warn(`Unknown auth provider: ${yamlAuth.provider}`);
  }
}

function mapYamlToEntraIdConfig(yamlAuth: YamlAuthConfig): EntraIdConfig | null {
  if (yamlAuth.provider === 'entra-id' && yamlAuth.entraId) {
    const entra = yamlAuth.entraId;
    return {
      enabled: true,
      tenantId: entra.tenantId,
      clientId: entra.clientId,
      redirectUri: entra.redirectUri || window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      scopes: entra.scopes || ['openid', 'profile', 'email'],
      cloud: (entra.cloud as EntraIdConfig['cloud']) || 'public',
    };
  }
  return null;
}
