// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as grpc from '@grpc/grpc-js';
import { GrpcReflection } from 'grpc-js-reflection-client';
import configManager from '../../config/configManager.js';
import * as reflectionMetadataCache from '../../cache/reflectionMetadataCache.js';
import { loadClientCertificateFiles } from '../../utils/clientCertificateFiles.js';
import logger from '../../utils/logger.js';

const reflectionClientLogger = logger.child({ module: 'reflection-client' });

const REFLECTION_VERSION_CACHE_KEY = 'reflection-version';
const REFLECTION_VERSIONS = ['v1', 'v1alpha'] as const;

type ReflectionVersion = typeof REFLECTION_VERSIONS[number];

// Key: the constant 'reflection-version'.
// Value: supported reflection protocol version, for example 'v1' or 'v1alpha'.
// Why TTL: the same endpoint can be redeployed or load-balanced to a server that
// supports a different reflection version, and we should recover without restart.
// The key does not include host because this backend process has one configured
// gRPC target. If runtime target switching is added, clear this cache on switch.
const reflectionVersionCache = reflectionMetadataCache.createReflectionMetadataCache<ReflectionVersion>();

export function getConfiguredHost(): string {
  const clientConfig = configManager.getClientConfig();
  return `${clientConfig.target.host}:${clientConfig.target.port}`;
}

function createCredentials(): grpc.ChannelCredentials {
  const clientConfig = configManager.getClientConfig();

  if (clientConfig.mode === 'plaintext') {
    reflectionClientLogger.debug('Using plaintext reflection credentials');
    return grpc.credentials.createInsecure();
  }

  if (clientConfig.mode === 'tls') {
    reflectionClientLogger.debug('Using TLS reflection credentials');
    try {
      const { ca, key, cert } = loadClientCertificateFiles();
      return grpc.credentials.createSsl(ca, key, cert);
    } catch (error) {
      reflectionClientLogger.error('Failed to load TLS certificates', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (clientConfig.mode === 'mtls') {
    reflectionClientLogger.debug('Using mTLS reflection credentials');
    try {
      const { cert, key, ca } = loadClientCertificateFiles();
      return grpc.credentials.createSsl(ca, key, cert);
    } catch (error) {
      reflectionClientLogger.error('Failed to load mTLS certificates');
      throw error;
    }
  }

  throw new Error(`Unknown gRPC client mode: ${clientConfig.mode}`);
}

export async function createReflectionClient(
  host = getConfiguredHost(),
  credentials = createCredentials()
): Promise<GrpcReflection> {
  const channelOptions = getGrpcJsChannelOptions();
  const version = await resolveReflectionVersion(host, credentials, channelOptions);
  return new GrpcReflection(host, credentials, channelOptions, version);
}

export function clearReflectionVersionCache(): void {
  reflectionVersionCache.clear();
  reflectionClientLogger.info('Cleared reflection version cache');
}

export function getReflectionCallOptions(): grpc.CallOptions {
  return {
    deadline: new Date(Date.now() + configManager.getClientConfig().reflection.deadlineMs),
  };
}

async function resolveReflectionVersion(
  host: string,
  credentials: grpc.ChannelCredentials,
  channelOptions: Record<string, number>
): Promise<ReflectionVersion> {
  const cachedVersion = reflectionVersionCache.get(REFLECTION_VERSION_CACHE_KEY);

  if (cachedVersion !== undefined) {
    reflectionClientLogger.debug('Using cached reflection version', { host, version: cachedVersion });
    return cachedVersion;
  }

  for (const version of REFLECTION_VERSIONS) {
    try {
      reflectionClientLogger.debug('Trying reflection version', { host, version });
      const client = new GrpcReflection(host, credentials, channelOptions, version);
      await client.listServices('*', getReflectionCallOptions());
      reflectionClientLogger.info('Reflection version detected', { host, version });
      reflectionVersionCache.set(REFLECTION_VERSION_CACHE_KEY, version);
      return version;
    } catch (error) {
      if (error instanceof Error && error.message?.includes('UNIMPLEMENTED')) {
        reflectionClientLogger.debug('Reflection version not supported', { host, version });
        continue;
      }
      throw error;
    }
  }

  throw new Error('Server does not support gRPC reflection (tried v1 and v1alpha)');
}

function getGrpcJsChannelOptions(): Record<string, number> {
  const clientConfig = configManager.getClientConfig();
  return {
    'grpc.keepalive_time_ms': clientConfig.keepalive.pingIntervalMs,
    'grpc.keepalive_timeout_ms': clientConfig.keepalive.pingTimeoutMs,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.max_receive_message_length': clientConfig.maxReceiveMessageBytes,
  };
}
