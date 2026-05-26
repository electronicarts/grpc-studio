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

  { env: ['GRPC_CLIENT_MODE', 'CONNECTION_MODE'], path: ['client', 'mode'] },
  { env: ['GRPC_TARGET_HOST', 'TARGET_HOST'], path: ['client', 'target', 'host'] },
  { env: ['GRPC_TARGET_PORT', 'TARGET_PORT'], path: ['client', 'target', 'port'] },
  { env: ['GRPC_UNARY_DEADLINE_MS', 'GRPC_REQUEST_TIMEOUT_MS'], path: ['client', 'rpc', 'unaryDeadlineMs'] },
  { env: ['GRPC_STREAM_DEADLINE_MS'], path: ['client', 'rpc', 'streamDeadlineMs'] },
  { env: ['GRPC_REFLECTION_DEADLINE_MS', 'REFLECTION_DEADLINE_MS'], path: ['client', 'reflection', 'deadlineMs'] },
  { env: ['GRPC_KEEPALIVE_PING_INTERVAL_MS', 'GRPC_KEEPALIVE_TIME_MS'], path: ['client', 'keepalive', 'pingIntervalMs'] },
  { env: ['GRPC_KEEPALIVE_PING_TIMEOUT_MS', 'GRPC_KEEPALIVE_TIMEOUT_MS'], path: ['client', 'keepalive', 'pingTimeoutMs'] },
  { env: ['GRPC_MAX_RECEIVE_BYTES'], path: ['client', 'maxReceiveMessageBytes'] },
  { env: ['GRPC_CLIENT_CERT', 'MTLS_CLIENT_CERT'], path: ['client', 'security', 'clientCertPath'] },
  { env: ['GRPC_CLIENT_KEY', 'MTLS_CLIENT_KEY'], path: ['client', 'security', 'clientKeyPath'] },
  { env: ['GRPC_CA_CERT', 'MTLS_CA_CERT'], path: ['client', 'security', 'caCertPath'] },

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

  for (const override of ENV_OVERRIDES) {
    const value = getFirstEnvValue(env, override.env);
    if (value !== undefined) {
      setConfigValue(result, override.path, value);
    }
  }

  return result;
}

function getFirstEnvValue(env: NodeJS.ProcessEnv, names: readonly string[]): string | undefined {
  return names.map(name => env[name]).find(value => value !== undefined);
}

function setConfigValue(config: Record<string, unknown>, path: ConfigPath, value: string): void {
  let target = config;

  for (const key of path.slice(0, -1)) {
    const current = target[key];
    const next = isRecord(current) ? { ...current } : {};
    target[key] = next;
    target = next;
  }

  target[path[path.length - 1]] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
