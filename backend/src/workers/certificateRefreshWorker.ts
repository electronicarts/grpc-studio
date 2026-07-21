// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import multiClientManager from '../grpc/multiClientManager.js';
import serverCertificateCache from '../cache/serverCertificateCache.js';
import { extractRemoteServerCertificate, type CertificateMetadata } from '../utils/certificateUtils.js';
import logger from '../utils/logger.js';

const workerLogger = logger.child({ module: 'certificate-refresh-worker' });

/** Extracts a remote server's certificate metadata; injectable for testing. */
type CertificateExtractor = (host: string, port: number) => Promise<CertificateMetadata | null>;

/**
 * Background worker that periodically refreshes server certificates
 * Separated from cache to follow single responsibility principle
 */
export class CertificateRefreshWorker {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 3600000; // 1 hour
  private isRefreshing = false;

  // ESM namespace exports are non-configurable, so the extractor is injected here to
  // keep the worker unit-testable while defaulting to the real implementation.
  constructor(private readonly extractCertificate: CertificateExtractor = extractRemoteServerCertificate) {}

  /**
   * Start the background worker
   */
  async start(): Promise<void> {
    workerLogger.info('Starting certificate refresh worker');

    // Initial extraction (non-blocking - let it run in background)
    this.refreshAllCertificates().catch(err => {
      workerLogger.error('Initial certificate extraction failed', { error: err.message });
    });

    // Set up periodic refresh
    this.refreshInterval = setInterval(() => {
      this.refreshAllCertificates().catch(err => {
        workerLogger.error('Periodic certificate refresh failed', { error: err.message });
      });
    }, this.REFRESH_INTERVAL_MS);

    workerLogger.info('Certificate refresh worker started', {
      refreshIntervalMs: this.REFRESH_INTERVAL_MS,
    });
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    workerLogger.info('Certificate refresh worker stopped');
  }

  /**
   * Manually trigger a refresh for all certificates
   */
  async refreshAllCertificates(): Promise<void> {
    if (this.isRefreshing) {
      workerLogger.debug('Certificate refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();

    try {
      const targetNames = multiClientManager.getTargetNames();
      workerLogger.info('Starting certificate refresh for all targets', {
        targetCount: targetNames.length,
      });

      // Extract certificates in parallel (but with Promise.allSettled to not fail fast)
      const promises = targetNames.map(async (targetName) => {
        const targetConfig = multiClientManager.getTargetConfig(targetName);

        // Only extract for TLS/mTLS targets
        if (targetConfig.mode !== 'tls' && targetConfig.mode !== 'mtls') {
          return;
        }

        try {
          const certInfo = await this.extractCertificate(
            targetConfig.host,
            targetConfig.port
          );

          serverCertificateCache.set(targetName, {
            info: certInfo,
            lastUpdated: new Date(),
          });

          if (certInfo) {
            workerLogger.debug('Certificate extracted successfully', {
              target: targetName,
              expiresIn: certInfo.daysRemaining,
            });
          } else {
            workerLogger.debug('No certificate available', { target: targetName });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          serverCertificateCache.set(targetName, {
            info: null,
            lastUpdated: new Date(),
            error: errorMsg,
          });
          workerLogger.warn('Failed to extract certificate', {
            target: targetName,
            error: errorMsg,
          });
        }
      });

      await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      workerLogger.info('Certificate refresh completed', {
        targetCount: targetNames.length,
        durationMs: duration,
        cached: serverCertificateCache.size(),
      });
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Refresh certificate for a specific target
   */
  async refreshCertificate(targetName: string): Promise<void> {
    const targetConfig = multiClientManager.getTargetConfig(targetName);

    if (targetConfig.mode !== 'tls' && targetConfig.mode !== 'mtls') {
      workerLogger.debug('Target does not use TLS/mTLS, skipping', { target: targetName });
      return;
    }

    try {
      const certInfo = await this.extractCertificate(
        targetConfig.host,
        targetConfig.port
      );

      serverCertificateCache.set(targetName, {
        info: certInfo,
        lastUpdated: new Date(),
      });

      workerLogger.info('Certificate refreshed for target', {
        target: targetName,
        expiresIn: certInfo?.daysRemaining,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      serverCertificateCache.set(targetName, {
        info: null,
        lastUpdated: new Date(),
        error: errorMsg,
      });
      workerLogger.warn('Failed to refresh certificate', {
        target: targetName,
        error: errorMsg,
      });
      throw error;
    }
  }
}

// Singleton instance
const certificateRefreshWorker = new CertificateRefreshWorker();
export default certificateRefreshWorker;
