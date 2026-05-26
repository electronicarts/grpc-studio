// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { FrontendConfig } from './types';
import { getConfig } from './configState';

function appendBaseUrl(path: string, baseUrl: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    return cleanPath;
  }

  const normalizedBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBaseUrl}${cleanPath}`;
}

/**
 * Build API URL for a known endpoint key.
 */
export const buildApiUrl = (endpoint: keyof FrontendConfig['api']['endpoints']): string => {
  const config = getConfig();
  return appendBaseUrl(config.api.endpoints[endpoint], config.api.baseUrl);
};

/**
 * Build API URL with an arbitrary path.
 */
export const buildCustomApiUrl = (path: string): string => {
  return appendBaseUrl(path, getConfig().api.baseUrl);
};
