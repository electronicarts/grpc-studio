// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import 'dotenv/config';
import fs from 'fs';
import yaml from 'js-yaml';

import { AppConfigSchema, type AppConfig } from './schemas/appConfigSchema.js';
import { logLoadedConfig } from './configLogger.js';

const CONFIG_PATH_ENV_VAR = 'GRPC_STUDIO_CONFIG';

type ConfigPath = readonly string[];

interface EnvOverride {
  env: readonly string[];
  path: ConfigPath;
}

const ENV_OVERRIDES: readonly EnvOverride[] = [
  { env: ['PORT'], path: ['server', 'port'] },
  { env: ['HOST'], path: ['server', 'host'] },
  { env: ['SHUTDOWN_GRACE_PERIOD_MS', 'SHUTDOWN_TIMEOUT_MS'], path: ['server', 'shutdownGracePeriodMs'] },
  { env: ['HTTP_RESPONSE_TIMEOUT_MS', 'REQUEST_TIMEOUT_MS'], path: ['server', 'http', 'responseTimeoutMs'] },
  { env: ['BODY_LIMIT_BYTES'], path: ['server', 'http', 'bodyLimitBytes'] },
  { env: ['WS_MAX_CONNECTIONS'], path: ['server', 'websocket', 'maxConnections'] },
  { env: ['WS_MAX_PAYLOAD_BYTES'], path: ['server', 'websocket', 'maxPayloadBytes'] },
  { env: ['WS_HEARTBEAT_INTERVAL_MS', 'WS_PING_INTERVAL_MS'], path: ['server', 'websocket', 'heartbeatIntervalMs'] },

  { env: ['GRPC_TARGET_NAME'], path: ['client', 'targets', '0', 'name'] },
  { env: ['GRPC_TARGET_HOST'], path: ['client', 'targets', '0', 'host'] },
  { env: ['GRPC_TARGET_PORT'], path: ['client', 'targets', '0', 'port'] },
  { env: ['GRPC_TARGET_MODE'], path: ['client', 'targets', '0', 'mode'] },

  { env: ['CERT_READ_TIMEOUT_MS'], path: ['certificate', 'certReadTimeoutMs'] },
  { env: ['CERT_WARN_DAYS_CRITICAL'], path: ['certificate', 'warnDaysCritical'] },
  { env: ['CERT_WARN_DAYS_WARNING'], path: ['certificate', 'warnDaysWarning'] },
];

interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  logConfig?: boolean;
}

export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const env = options.env ?? process.env;
  const configPath = options.configPath ?? getConfigPath(env);
  const rawConfig = readYamlConfig(configPath);
  const configWithEnvOverrides = applyEnvOverrides(rawConfig, env);
  const appConfig = parseAppConfig(configWithEnvOverrides);

  if (options.logConfig !== false) {
    logLoadedConfig(configPath, appConfig);
  }

  return appConfig;
}

function getConfigPath(env: NodeJS.ProcessEnv): string {
  const configPath = env[CONFIG_PATH_ENV_VAR]?.trim();
  if (!configPath) {
    throw new Error(`${CONFIG_PATH_ENV_VAR} is required. Set it to the backend YAML configuration file.`);
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  return configPath;
}

function readYamlConfig(configPath: string): Record<string, unknown> {
  return (yaml.load(fs.readFileSync(configPath, 'utf8')) ?? {}) as Record<string, unknown>;
}

function parseAppConfig(config: unknown): AppConfig {
  const parseResult = AppConfigSchema.safeParse(config);
  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map(i => `  [${i.path.join('.')}] ${i.message}`)
      .join('\n');
    throw new Error(`Configuration validation failed:\n${issues}`);
  }
  return parseResult.data;
}

function applyEnvOverrides(config: Record<string, unknown>, env: NodeJS.ProcessEnv): Record<string, unknown> {
  const result = { ...config };

  // Apply static overrides
  for (const override of ENV_OVERRIDES) {
    const value = getFirstEnvValue(env, override.env);
    if (value !== undefined) {
      setConfigValue(result, override.path, value);
    }
  }

  // Apply dynamic indexed target overrides (GRPC_TARGET_0_HOST, GRPC_TARGET_1_HOST, etc.)
  const targetFields = ['name', 'host', 'port', 'mode'];
  const maxTargets = 10; // Support up to 10 targets via env vars

  // Ensure client.targets exists as an array
  if (!result.client || !isRecord(result.client)) {
    result.client = {};
  }
  const client = result.client as Record<string, unknown>;
  if (!Array.isArray(client.targets)) {
    client.targets = [];
  }
  const targets = client.targets as Array<Record<string, unknown>>;

  for (let i = 0; i < maxTargets; i++) {
    let hasAnyOverride = false;
    const overrides: Record<string, string> = {};

    for (const field of targetFields) {
      const envKey = `GRPC_TARGET_${i}_${field.toUpperCase()}`;
      const value = env[envKey];

      if (value !== undefined) {
        hasAnyOverride = true;
        overrides[field] = value;
      }
    }

    if (hasAnyOverride) {
      // Ensure target exists at this index
      while (targets.length <= i) {
        targets.push({});
      }

      // Apply overrides to target
      for (const [field, value] of Object.entries(overrides)) {
        if (!isRecord(targets[i])) {
          targets[i] = {};
        }
        (targets[i] as Record<string, unknown>)[field] = value;
      }
    } else if (i > 0) {
      // No overrides found for this index and we're past index 0, stop
      break;
    }
  }

  return result;
}

function getFirstEnvValue(env: NodeJS.ProcessEnv, names: readonly string[]): string | undefined {
  return names.map(name => env[name]).find(value => value !== undefined);
}

function setConfigValue(config: Record<string, unknown>, path: ConfigPath, value: string): void {
  let target: any = config;

  // Navigate to the parent of the final key
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    if (/^\d+$/.test(key)) {
      // Key is an array index
      const index = parseInt(key, 10);
      if (!Array.isArray(target) || index >= target.length) {
        return; // Skip if not an array or index out of bounds
      }
      target = target[index];
    } else {
      // Key is an object property
      const current = target[key];
      // Only create new object if it doesn't exist AND next key is not an array index
      const nextKey = path[i + 1];
      const nextIsArrayIndex = /^\d+$/.test(nextKey);

      if (current === undefined || current === null) {
        if (nextIsArrayIndex) {
          return; // Can't create array dynamically
        }
        target[key] = {};
      } else if (!isRecord(current) && !Array.isArray(current)) {
        return; // Can't override primitive values with objects
      }

      target = target[key];
    }
  }

  // Set the final value
  const lastKey = path[path.length - 1];
  if (/^\d+$/.test(lastKey)) {
    const index = parseInt(lastKey, 10);
    if (Array.isArray(target) && index < target.length) {
      target[index] = value;
    }
  } else {
    target[lastKey] = value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
