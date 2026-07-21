// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import * as grpc from '@grpc/grpc-js';
import { GrpcReflection } from 'grpc-js-reflection-client';
import type { Transport } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import type * as http2 from 'node:http2';
import fs from 'node:fs';
import configManager from '../config/configManager.js';
import authManager from '../auth/authManager.js';
import type { TargetConfig } from '../config/schemas/clientSchema.js';
import logger from '../utils/logger.js';

interface ClientCertificateFiles {
  ca: Buffer | null;
  cert: Buffer | null;
  key: Buffer | null;
}

const multiClientLogger = logger.child({ module: 'multi-client-manager' });

interface ClientSet {
  target: TargetConfig;
  reflectionClient: GrpcReflection | null;
  connectTransport: Transport | null;
}

/**
 * Manages gRPC reflection clients and Connect transports for multiple targets.
 * Each target gets its own set of clients, isolated from others.
 */
class MultiClientManager {
  private clients: Map<string, ClientSet> = new Map();

  /**
   * Initialize clients for all configured targets
   */
  async initialize(): Promise<void> {
    const targets = configManager.getTargets();

    if (targets.length === 0) {
      throw new Error('No targets configured in client config');
    }

    multiClientLogger.info('Initializing clients for targets', {
      targetCount: targets.length,
      targetNames: targets.map(t => t.name),
    });

    for (const target of targets) {
      this.clients.set(target.name, {
        target,
        reflectionClient: null,
        connectTransport: null,
      });
    }
  }

  /**
   * Reinitialize clients from config (useful when config changes)
   * Clears existing clients, reloads config from disk, and re-initializes
   */
  async reinitialize(): Promise<void> {
    multiClientLogger.info('Reinitializing clients from config');
    this.close();
    configManager.reload();
    await this.initialize();
  }

  /**
   * Get or create reflection client for a target
   */
  async getReflectionClient(targetName: string): Promise<GrpcReflection> {
    const clientSet = this.clients.get(targetName);
    if (!clientSet) {
      throw new Error(`Target '${targetName}' not configured`);
    }

    if (clientSet.reflectionClient) {
      return clientSet.reflectionClient;
    }

    multiClientLogger.debug('Creating reflection client', { target: targetName });
    const host = `${clientSet.target.host}:${clientSet.target.port}`;
    const credentials = this.createReflectionCredentials(clientSet.target);
    const channelOptions = this.getGrpcJsChannelOptions(clientSet.target);
    const version = await this.resolveReflectionVersion(host, credentials, channelOptions, clientSet.target);

    clientSet.reflectionClient = new GrpcReflection(host, credentials, channelOptions, version);
    return clientSet.reflectionClient;
  }

  /**
   * Get or create Connect transport for a target
   */
  getConnectTransport(targetName: string, forceRecreate = false): Transport {
    const clientSet = this.clients.get(targetName);
    if (!clientSet) {
      throw new Error(`Target '${targetName}' not configured`);
    }

    // If forceRecreate is true, clear the existing transport to create a fresh one
    if (forceRecreate && clientSet.connectTransport) {
      multiClientLogger.info('Recreating stale Connect transport', { target: targetName });
      clientSet.connectTransport = null;
    }

    if (clientSet.connectTransport) {
      return clientSet.connectTransport;
    }

    multiClientLogger.debug('Creating Connect transport', { target: targetName });
    const scheme = clientSet.target.mode === 'plaintext' ? 'http' : 'https';
    const baseUrl = `${scheme}://${clientSet.target.host}:${clientSet.target.port}`;

    clientSet.connectTransport = createGrpcTransport({
      baseUrl,
      nodeOptions: this.getNodeOptions(clientSet.target),
      pingIntervalMs: clientSet.target.keepalive?.pingIntervalMs || 30000,
      pingTimeoutMs: clientSet.target.keepalive?.pingTimeoutMs || 10000,
      pingIdleConnection: true,
      readMaxBytes: clientSet.target.maxReceiveMessageBytes || 104857600,
    });

    return clientSet.connectTransport;
  }

  /**
   * Get target config by name
   */
  getTargetConfig(targetName: string): TargetConfig {
    const clientSet = this.clients.get(targetName);
    if (!clientSet) {
      throw new Error(`Target '${targetName}' not configured`);
    }
    return clientSet.target;
  }

  /**
   * Get all target names
   */
  getTargetNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get credentials for a target (useful for certificate inspection)
   */
  getCredentialsForTarget(targetName: string): grpc.ChannelCredentials {
    const clientSet = this.clients.get(targetName);
    if (!clientSet) {
      throw new Error(`Target '${targetName}' not configured`);
    }
    return this.createReflectionCredentials(clientSet.target);
  }

  /**
   * Get reflection call options for a target (with auth headers)
   */
  async getReflectionCallOptions(targetName: string): Promise<grpc.CallOptions> {
    const clientSet = this.clients.get(targetName);
    if (!clientSet) {
      throw new Error(`Target '${targetName}' not configured`);
    }

    const deadlineMs = clientSet.target.reflection?.deadlineMs || 25000;
    const callOptions: grpc.CallOptions = {
      deadline: new Date(Date.now() + deadlineMs),
    };

    // Add auth headers if auth plugin is configured
    try {
      const authPlugin = authManager.getCurrentPlugin();
      if (authPlugin) {
        const authHeaders = await authPlugin.getHeaders();
        if (authHeaders && Object.keys(authHeaders).length > 0) {
          const metadata = new grpc.Metadata();
          for (const [key, value] of Object.entries(authHeaders)) {
            metadata.add(key.toLowerCase(), value);
          }
          callOptions.credentials = grpc.credentials.createFromMetadataGenerator((_params, callback) => {
            callback(null, metadata);
          });
        }
      }
    } catch (error) {
      multiClientLogger.warn('Failed to get auth headers for reflection call', {
        target: targetName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without auth headers rather than failing
    }

    return callOptions;
  }

  /**
   * Close all clients and release their underlying connections.
   *
   * The reflection client wraps a grpc-js Client that holds a live HTTP/2 channel;
   * we call its close() to tear the channel down rather than waiting for GC. The
   * Connect transport (connect-node) manages its HTTP/2 sessions internally and
   * exposes no public close, so dropping the reference is the most we can do there —
   * its sessions were created with pingIdleConnection and close on idle.
   */
  close(): void {
    multiClientLogger.info('Closing all clients', { count: this.clients.size });
    for (const [name, clientSet] of this.clients.entries()) {
      multiClientLogger.debug('Closing client set', { target: name });
      this.closeReflectionClient(name, clientSet.reflectionClient);
      clientSet.reflectionClient = null;
      clientSet.connectTransport = null;
    }
    this.clients.clear();
  }

  private closeReflectionClient(targetName: string, reflectionClient: GrpcReflection | null): void {
    if (!reflectionClient) return;

    // GrpcReflection keeps its grpc-js Client on a private `client` field. grpc-js
    // Clients expose close(); call it if present to release the HTTP/2 channel.
    const underlying = (reflectionClient as unknown as { client?: { close?: () => void } }).client;
    if (underlying && typeof underlying.close === 'function') {
      try {
        underlying.close();
      } catch (error) {
        multiClientLogger.warn('Failed to close reflection client channel', {
          target: targetName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private createReflectionCredentials(target: TargetConfig): grpc.ChannelCredentials {
    if (target.mode === 'plaintext') {
      multiClientLogger.debug('Using plaintext credentials', { target: target.name });
      return grpc.credentials.createInsecure();
    }

    if (target.mode === 'tls' || target.mode === 'mtls') {
      multiClientLogger.debug(`Using ${target.mode.toUpperCase()} credentials`, { target: target.name });
      try {
        const { ca, key, cert } = this.loadTargetCertificateFiles(target);
        return grpc.credentials.createSsl(ca, key, cert);
      } catch (error) {
        multiClientLogger.error('Failed to load certificates', {
          target: target.name,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    throw new Error(`Unknown gRPC client mode: ${target.mode}`);
  }

  private getGrpcJsChannelOptions(target: TargetConfig): Record<string, number> {
    return {
      'grpc.keepalive_time_ms': target.keepalive?.pingIntervalMs || 30000,
      'grpc.keepalive_timeout_ms': target.keepalive?.pingTimeoutMs || 10000,
      'grpc.keepalive_permit_without_calls': 1,
      'grpc.max_receive_message_length': target.maxReceiveMessageBytes || 104857600,
    };
  }

  private getNodeOptions(target: TargetConfig): http2.ClientSessionOptions | http2.SecureClientSessionOptions | undefined {
    if (target.mode === 'plaintext') {
      return undefined;
    }

    if (target.mode === 'tls' || target.mode === 'mtls') {
      const files = this.loadTargetCertificateFiles(target);
      return {
        ca: files.ca ?? undefined,
        cert: files.cert ?? undefined,
        key: files.key ?? undefined,
      };
    }

    throw new Error(`Unknown gRPC client mode: ${target.mode}`);
  }

  private loadTargetCertificateFiles(target: TargetConfig): ClientCertificateFiles {
    const security = target.security;
    return {
      ca: security?.caCertPath ? fs.readFileSync(security.caCertPath) : null,
      cert: security?.clientCertPath ? fs.readFileSync(security.clientCertPath) : null,
      key: security?.clientKeyPath ? fs.readFileSync(security.clientKeyPath) : null,
    };
  }

  private async resolveReflectionVersion(
    host: string,
    credentials: grpc.ChannelCredentials,
    channelOptions: Record<string, number>,
    target: TargetConfig
  ): Promise<'v1' | 'v1alpha'> {
    const versions: Array<'v1' | 'v1alpha'> = ['v1', 'v1alpha'];
    const deadlineMs = target.reflection?.deadlineMs || 25000;

    for (const version of versions) {
      try {
        multiClientLogger.debug('Trying reflection version', { target: target.name, version });
        const client = new GrpcReflection(host, credentials, channelOptions, version);
        await client.listServices('*', {
          deadline: new Date(Date.now() + deadlineMs),
        });
        multiClientLogger.info('Reflection version detected', { target: target.name, version });
        return version;
      } catch (error) {
        if (error instanceof Error && error.message?.includes('UNIMPLEMENTED')) {
          multiClientLogger.debug('Reflection version not supported', { target: target.name, version });
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Server '${target.name}' does not support gRPC reflection (tried v1 and v1alpha)`);
  }
}

// Singleton instance
const multiClientManager = new MultiClientManager();
export default multiClientManager;
