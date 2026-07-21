// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import multiClientManager from '../grpc/multiClientManager.js'
import serverCertificateCache from '../cache/serverCertificateCache.js'
import type { CertificateMetadata } from '../utils/certificateUtils.js'
import type { TargetConfig } from '../config/schemas/clientSchema.js'
import { CertificateRefreshWorker } from '../workers/certificateRefreshWorker.js'

function target(name: string, mode: TargetConfig['mode']): TargetConfig {
  return { name, host: `${name}.example.com`, port: 443, mode } as TargetConfig
}

function cert(daysRemaining: number): CertificateMetadata {
  return {
    subject: 'CN=example',
    issuer: 'CN=issuer',
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T00:00:00Z'),
    daysRemaining,
  }
}

describe('CertificateRefreshWorker', () => {
  beforeEach(() => {
    serverCertificateCache.clear()
  })

  afterEach(() => {
    mock.restoreAll()
    serverCertificateCache.clear()
  })

  it('extracts and caches certificates for TLS and mTLS targets only', async () => {
    mock.method(multiClientManager, 'getTargetNames', () => ['tls-target', 'mtls-target', 'plain-target'])
    mock.method(multiClientManager, 'getTargetConfig', (name: string) => {
      if (name === 'tls-target') return target('tls-target', 'tls')
      if (name === 'mtls-target') return target('mtls-target', 'mtls')
      return target('plain-target', 'plaintext')
    })
    const extract = mock.fn(async () => cert(90))
    const worker = new CertificateRefreshWorker(extract)

    await worker.refreshAllCertificates()

    // Plaintext target is skipped, so extraction runs only for the two secure targets.
    assert.equal(extract.mock.callCount(), 2)
    assert.ok(serverCertificateCache.has('tls-target'))
    assert.ok(serverCertificateCache.has('mtls-target'))
    assert.equal(serverCertificateCache.has('plain-target'), false)
    assert.equal(serverCertificateCache.get('tls-target')?.info?.daysRemaining, 90)
  })

  it('caches a null info + error entry when extraction throws, without failing the batch', async () => {
    mock.method(multiClientManager, 'getTargetNames', () => ['good', 'bad'])
    mock.method(multiClientManager, 'getTargetConfig', (name: string) => target(name, 'tls'))
    const extract = mock.fn(async (host: string) => {
      if (host.startsWith('bad')) throw new Error('handshake failed')
      return cert(30)
    })
    const worker = new CertificateRefreshWorker(extract)

    // Should resolve (Promise.allSettled) even though one target throws.
    await worker.refreshAllCertificates()

    assert.equal(serverCertificateCache.get('good')?.info?.daysRemaining, 30)
    const badEntry = serverCertificateCache.get('bad')
    assert.equal(badEntry?.info, null)
    assert.match(badEntry?.error ?? '', /handshake failed/)
  })

  it('is reentrancy-guarded: a second concurrent refresh is skipped', async () => {
    mock.method(multiClientManager, 'getTargetNames', () => ['t1'])
    mock.method(multiClientManager, 'getTargetConfig', () => target('t1', 'tls'))
    let resolveExtract: (value: CertificateMetadata) => void = () => {}
    const extract = mock.fn(() =>
      new Promise<CertificateMetadata>((resolve) => {
        resolveExtract = resolve
      })
    )
    const worker = new CertificateRefreshWorker(extract)

    const first = worker.refreshAllCertificates()
    // Second call while the first is still in flight must short-circuit.
    const second = worker.refreshAllCertificates()
    await second
    assert.equal(extract.mock.callCount(), 1, 'second concurrent refresh should not extract')

    resolveExtract(cert(10))
    await first
    assert.equal(serverCertificateCache.get('t1')?.info?.daysRemaining, 10)
  })

  it('refreshCertificate skips non-secure targets', async () => {
    mock.method(multiClientManager, 'getTargetConfig', () => target('plain', 'plaintext'))
    const extract = mock.fn(async () => cert(1))
    const worker = new CertificateRefreshWorker(extract)

    await worker.refreshCertificate('plain')

    assert.equal(extract.mock.callCount(), 0)
    assert.equal(serverCertificateCache.has('plain'), false)
  })

  it('refreshCertificate caches error and rethrows on failure', async () => {
    mock.method(multiClientManager, 'getTargetConfig', () => target('t', 'mtls'))
    const extract = mock.fn(async () => {
      throw new Error('connection refused')
    })
    const worker = new CertificateRefreshWorker(extract)

    await assert.rejects(() => worker.refreshCertificate('t'), /connection refused/)
    assert.match(serverCertificateCache.get('t')?.error ?? '', /connection refused/)
  })
})
