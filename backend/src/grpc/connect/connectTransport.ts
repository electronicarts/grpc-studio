// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type * as http2 from 'node:http2'
import type { Transport } from '@connectrpc/connect'
import { createGrpcTransport } from '@connectrpc/connect-node'
import configManager from '../../config/configManager.js'
import {
  type ClientCertificateFiles,
  loadClientCertificateFiles,
} from '../../utils/clientCertificateFiles.js'
import logger from '../../utils/logger.js'

const transportLogger = logger.child({ module: 'connect-transport' })

function getConfiguredBaseUrl(): string {
  const clientConfig = configManager.getClientConfig()
  const scheme = clientConfig.mode === 'plaintext' ? 'http' : 'https'
  return `${scheme}://${clientConfig.target.host}:${clientConfig.target.port}`
}

function toNodeTlsOptions(files: ClientCertificateFiles): http2.SecureClientSessionOptions {
  return {
    ca: files.ca ?? undefined,
    cert: files.cert ?? undefined,
    key: files.key ?? undefined,
  }
}

function getNodeOptions(): http2.ClientSessionOptions | http2.SecureClientSessionOptions | undefined {
  const clientConfig = configManager.getClientConfig()

  if (clientConfig.mode === 'plaintext') {
    transportLogger.debug('Using plaintext Connect transport')
    return undefined
  }

  if (clientConfig.mode === 'tls') {
    transportLogger.debug('Using TLS Connect transport')
    return toNodeTlsOptions(loadClientCertificateFiles())
  }

  if (clientConfig.mode === 'mtls') {
    transportLogger.debug('Using mTLS Connect transport')
    return toNodeTlsOptions(loadClientCertificateFiles())
  }

  throw new Error(`Unknown gRPC client mode: ${clientConfig.mode}`)
}

export class ConnectTransportProvider {
  private cachedTransport: Transport | null = null
  private cachedBaseUrl: string | null = null

  getTransport(baseUrl = getConfiguredBaseUrl()): Transport {
    if (this.cachedTransport && this.cachedBaseUrl === baseUrl) {
      return this.cachedTransport
    }

    const clientConfig = configManager.getClientConfig()
    this.cachedTransport = createGrpcTransport({
      baseUrl,
      nodeOptions: getNodeOptions(),
      pingIntervalMs: clientConfig.keepalive.pingIntervalMs,
      pingTimeoutMs: clientConfig.keepalive.pingTimeoutMs,
      pingIdleConnection: true,
      readMaxBytes: clientConfig.maxReceiveMessageBytes,
    })
    this.cachedBaseUrl = baseUrl
    return this.cachedTransport
  }

  close(): void {
    this.cachedTransport = null
    this.cachedBaseUrl = null
  }
}

export const connectTransportProvider = new ConnectTransportProvider()
export default connectTransportProvider
