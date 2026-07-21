// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { CertificateMetadata } from '../utils/certificateUtils.js';

/**
 * Cached certificate data for a target
 */
export interface CachedCertificate {
  info: CertificateMetadata | null;
  lastUpdated: Date;
  error?: string;
}

/**
 * Simple in-memory cache for server certificates
 * No side effects, no timers, no background work - just a Map wrapper
 */
class ServerCertificateCache {
  private cache: Map<string, CachedCertificate> = new Map();

  /**
   * Get cached certificate for a target
   */
  get(targetName: string): CachedCertificate | null {
    return this.cache.get(targetName) || null;
  }

  /**
   * Set certificate for a target
   */
  set(targetName: string, certificate: CachedCertificate): void {
    this.cache.set(targetName, certificate);
  }

  /**
   * Get all cached certificates
   */
  getAll(): Map<string, CachedCertificate> {
    return new Map(this.cache);
  }

  /**
   * Clear all cached certificates
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if a target has cached data
   */
  has(targetName: string): boolean {
    return this.cache.has(targetName);
  }

  /**
   * Get number of cached certificates
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
const serverCertificateCache = new ServerCertificateCache();
export default serverCertificateCache;
