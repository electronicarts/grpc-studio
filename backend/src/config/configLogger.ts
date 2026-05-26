// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import logger from '../utils/logger.js';
import type { AppConfig } from './schemas/appConfigSchema.js';

const configLogger = logger.child({ module: 'config' });
const SENSITIVE_CONFIG_KEY_PARTS = [
  'password',
  'secret',
  'token',
  'authorization',
  'credential',
  'cookie',
  'apikey',
  'accesskey',
  'privatekey',
  'clientkey',
];
const SENSITIVE_CONFIG_KEY_NAMES = ['key'];

export function logLoadedConfig(configPath: string, config: AppConfig): void {
  configLogger.info(`Loaded backend configuration from ${configPath}\n${formatConfigForLogging(config)}`);
}

function formatConfigForLogging(config: AppConfig): string {
  return JSON.stringify(sanitizeConfigForLogging(config), null, 2);
}

function sanitizeConfigForLogging(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeConfigForLogging);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveConfigKey(key) ? '[REDACTED]' : sanitizeConfigForLogging(entry),
    ])
  );
}

function isSensitiveConfigKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (normalized.endsWith('path')) return false;

  return SENSITIVE_CONFIG_KEY_NAMES.includes(normalized) ||
    SENSITIVE_CONFIG_KEY_PARTS.some(part => normalized.includes(part));
}
