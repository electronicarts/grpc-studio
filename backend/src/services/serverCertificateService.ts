// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import serverCertificateCache from '../cache/serverCertificateCache.js';
import certificateRefreshWorker from '../workers/certificateRefreshWorker.js';
import type { CachedCertificate } from '../cache/serverCertificateCache.js';

/**
 * Service for managing server certificate operations
 */
class ServerCertificateService {
  /**
   * Get certificate from cache
   */
  getCertificate(targetName: string): CachedCertificate | null {
    return serverCertificateCache.get(targetName);
  }

  /**
   * Get all certificates from cache
   */
  getAllCertificates(): Map<string, CachedCertificate> {
    return serverCertificateCache.getAll();
  }

  /**
   * Refresh all certificates and return updated cache
   */
  async refreshAllCertificates(): Promise<Map<string, CachedCertificate>> {
    await certificateRefreshWorker.refreshAllCertificates();
    return serverCertificateCache.getAll();
  }

  /**
   * Refresh a specific certificate and return updated cache entry
   */
  async refreshCertificate(targetName: string): Promise<CachedCertificate | null> {
    await certificateRefreshWorker.refreshCertificate(targetName);
    return serverCertificateCache.get(targetName);
  }

  /**
   * Check if a certificate is cached
   */
  hasCertificate(targetName: string): boolean {
    return serverCertificateCache.has(targetName);
  }

  /**
   * Get the number of cached certificates
   */
  getCacheSize(): number {
    return serverCertificateCache.size();
  }
}

const serverCertificateService = new ServerCertificateService();
export default serverCertificateService;
