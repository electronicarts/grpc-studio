// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Configuration, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import { createLogger } from '@/utils/debugLogger';
import type { AuthProviderInitResult, EntraIdConfig } from '../../types';

const logger = createLogger('Auth:EntraId');

const CLOUD_ENDPOINTS: Record<string, string> = {
  public: 'https://login.microsoftonline.com',
  government: 'https://login.microsoftonline.us',
  china: 'https://login.chinacloudapi.cn',
  germany: 'https://login.microsoftonline.de',
};

function getAuthority(tenantId: string, cloud: string = 'public'): string {
  const baseUrl = CLOUD_ENDPOINTS[cloud] || CLOUD_ENDPOINTS.public;
  return `${baseUrl}/${tenantId}`;
}

function buildMsalConfig(config: EntraIdConfig): Configuration {
  return {
    auth: {
      clientId: config.clientId,
      authority: getAuthority(config.tenantId, config.cloud),
      redirectUri: config.redirectUri || window.location.origin,
      postLogoutRedirectUri: config.postLogoutRedirectUri || window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:   logger.error('[MSAL]', message); break;
            case LogLevel.Warning: logger.warn('[MSAL]', message); break;
            case LogLevel.Info:    logger.info('[MSAL]', message); break;
            case LogLevel.Verbose: logger.debug('[MSAL]', message); break;
          }
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  };
}

/**
 * Initialize Entra ID (Azure AD) via MSAL.
 */
export async function initializeEntraId(config: EntraIdConfig): Promise<AuthProviderInitResult> {
  logger.info('Initializing Entra ID SSO');

  const msalInstance = new PublicClientApplication(buildMsalConfig(config));
  await msalInstance.initialize();

  const response = await msalInstance.handleRedirectPromise();
  if (response) {
    logger.info('Login redirect completed successfully');
  }

  logger.info('Entra ID SSO initialized');
  return { config, msalInstance };
}
