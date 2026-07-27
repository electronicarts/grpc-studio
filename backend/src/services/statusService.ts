// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import discoveryService from './discoveryService.js';
import multiClientManager from '../grpc/multiClientManager.js';
import certificateRepository from '../repositories/certificateRepository.js';
import configManager from '../config/configManager.js';
import serverCertificateService from './serverCertificateService.js';
import logger from '../utils/logger.js';
import { checkCertificateMetadata, getCertificateHealthStatus } from '../utils/certificateStatus.js';
import { errorMessage } from '../utils/errorMessage.js';
import type { ServerStatus } from '@grpc-studio/shared';

const serviceLogger = logger.child({ module: 'status-service' });

type CertInfo = NonNullable<ServerStatus['certificate']>['clientCert'];

/**
 * Service for checking connection status and certificate info for all targets
 */
class StatusService {
  /**
   * Get status for all configured targets
   */
  async getAllServerStatuses(): Promise<ServerStatus[]> {
    const targetNames = multiClientManager.getTargetNames();
    const servers: ServerStatus[] = [];

    for (const targetName of targetNames) {
      const status = await this.getServerStatus(targetName);
      servers.push(status);
    }

    return servers;
  }

  /**
   * Get status for a specific target
   */
  async getServerStatus(targetName: string): Promise<ServerStatus> {
    const targetConfig = multiClientManager.getTargetConfig(targetName);
    const targetAddress = `${targetConfig.host}:${targetConfig.port}`;

    // Get certificate info
    const certificate = await this.getCertificateInfo(targetName, targetConfig);

    // Check connection by listing services
    try {
      const services = await discoveryService.listServices(targetName);
      return {
        name: targetName,
        target: targetAddress,
        connected: true,
        servicesCount: services.length,
        error: null,
        certificate,
      };
    } catch (error) {
      serviceLogger.warn('Status check failed for target', {
        target: targetName,
        error: errorMessage(error),
      });
      return {
        name: targetName,
        target: targetAddress,
        connected: false,
        servicesCount: 0,
        error: 'Unable to connect to target server',
        certificate,
      };
    }
  }

  /**
   * Get certificate information for a target
   */
  private async getCertificateInfo(
    targetName: string,
    targetConfig: ReturnType<typeof multiClientManager.getTargetConfig>
  ): Promise<ServerStatus['certificate']> {
    const certConfig = configManager.getCertificateConfig();

    // Client certificate (for mTLS targets)
    const clientCert = await this.getClientCertInfo(targetName, targetConfig, certConfig);

    // Server certificate (from cache - non-blocking)
    const serverCert = this.getServerCertInfo(targetName, targetConfig, certConfig);

    // Only include certificate field if we have either client or server cert info
    if (clientCert || serverCert) {
      return {
        clientCert,
        serverCert,
      };
    }

    return null;
  }

  /**
   * Get client certificate info for mTLS targets
   */
  private async getClientCertInfo(
    targetName: string,
    targetConfig: ReturnType<typeof multiClientManager.getTargetConfig>,
    certConfig: ReturnType<typeof configManager.getCertificateConfig>
  ): Promise<CertInfo | undefined> {
    if (targetConfig.mode !== 'mtls' || !targetConfig.security?.clientCertPath) {
      return undefined;
    }

    try {
      const metadata = await certificateRepository.getCertificateMetadata(targetConfig.security.clientCertPath);
      const checkResult = checkCertificateMetadata(metadata);

      return {
        configured: true,
        expiresAt: checkResult.expiryDate?.toISOString(),
        daysRemaining: checkResult.daysRemaining ?? undefined,
        status: checkResult.valid
          ? getCertificateHealthStatus(checkResult.daysRemaining, certConfig.warnDaysCritical, certConfig.warnDaysWarning)
          : 'expired'
      };
    } catch (error) {
      serviceLogger.warn('Failed to read client certificate for target', {
        target: targetName,
        error: errorMessage(error),
      });
      return { configured: false };
    }
  }

  /**
   * Get server certificate info from cache
   */
  private getServerCertInfo(
    targetName: string,
    targetConfig: ReturnType<typeof multiClientManager.getTargetConfig>,
    certConfig: ReturnType<typeof configManager.getCertificateConfig>
  ): CertInfo | undefined {
    if (targetConfig.mode !== 'tls' && targetConfig.mode !== 'mtls') {
      return undefined;
    }

    const cached = serverCertificateService.getCertificate(targetName);
    if (!cached?.info) {
      return undefined;
    }

    const serverCertInfo = cached.info;
    const daysRemaining = serverCertInfo.daysRemaining;

    return {
      configured: true,
      expiresAt: serverCertInfo.validTo.toISOString(),
      daysRemaining,
      status: getCertificateHealthStatus(daysRemaining, certConfig.warnDaysCritical, certConfig.warnDaysWarning),
      issuer: serverCertInfo.issuer,
      subject: serverCertInfo.subject,
    };
  }
}

const statusService = new StatusService();
export default statusService;
