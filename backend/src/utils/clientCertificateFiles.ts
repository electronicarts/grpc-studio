// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shared client certificate loader.
 *
 * The backend has two gRPC transport stacks:
 * - @grpc/grpc-js for reflection
 * - @connectrpc/connect-node for method invocation
 *
 * Both stacks need the same configured CA/client cert/client key files. Keep the
 * file-reading and validation here so transport adapters only translate these
 * buffers into their own library-specific options.
 */

import fs from 'fs';
import configManager from '../config/configManager.js';

export interface ClientCertificateFiles {
  ca: Buffer | null;
  cert: Buffer | null;
  key: Buffer | null;
}

export function loadClientCertificateFiles(): ClientCertificateFiles {
  const { mode, security } = configManager.getClientConfig();
  const { clientCertPath, clientKeyPath, caCertPath } = security;

  if (mode === 'mtls' && (!clientCertPath || !clientKeyPath)) {
    throw new Error('mTLS mode requires client.security.clientCertPath and client.security.clientKeyPath');
  }

  try {
    return {
      cert: clientCertPath ? fs.readFileSync(clientCertPath) : null,
      key: clientKeyPath ? fs.readFileSync(clientKeyPath) : null,
      ca: caCertPath ? fs.readFileSync(caCertPath) : null,
    };
  } catch (error) {
    throw new Error(`Failed to load client certificates: ${error instanceof Error ? error.message : String(error)}`);
  }
}
