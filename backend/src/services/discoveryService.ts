// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * DiscoveryService uses gRPC reflection to list services and describe their
 * methods, and orchestrates discovery across all configured targets.
 */

import reflectionSchemaRepository, { type ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import multiClientManager from '../grpc/multiClientManager.js'
import logger from '../utils/logger.js'
import { errorMessage } from '../utils/errorMessage.js'
import type { ApiMethod, ApiService } from '../types/index.js'
import type { ApiServer } from '@grpc-studio/shared'

const discoveryLogger = logger.child({ module: 'native-service-discovery' })

export interface DiscoverServersOptions {
  /** Reinitialize the client manager from config before discovering. */
  forceReload?: boolean
  /** Restrict discovery to a single target by name. */
  targetFilter?: string
}

export class DiscoveryService {
  constructor(private readonly schemaRepository: ReflectionSchemaRepository = reflectionSchemaRepository) {}

  async listServices(target: string) {
    return this.schemaRepository.listServices(target)
  }

  async describeService(target: string, serviceName: string) {
    discoveryLogger.info('Describing service', { target, service: serviceName })

    try {
      const registry = await this.schemaRepository.getFileRegistry(target, serviceName)
      const descService = registry.getService(serviceName)

      if (!descService) {
        throw new Error(`Service ${serviceName} not found in descriptor`)
      }

      const methods: ApiMethod[] = descService.methods.map(m => ({
        name: m.name,
        inputType: m.input.typeName,
        outputType: m.output.typeName,
        kind: m.methodKind,
      }))

      const description: ApiService = {
        name: serviceName.split('.').pop(),
        fullName: serviceName,
        methods,
      }

      discoveryLogger.info('Described service', { target, methods: methods.length })

      return description
    } catch (error) {
      discoveryLogger.error('Failed to describe service', { target, service: serviceName, error: errorMessage(error) })
      throw error
    }
  }

  /**
   * Discover all services (with their methods) across every configured target,
   * or a single target when a filter is supplied.
   *
   * Failures are contained per-target and per-service so one bad target/service
   * never blocks discovery of the rest — the response still lists the target
   * (with empty services) so the frontend knows it exists.
   */
  async discoverServers(options: DiscoverServersOptions = {}): Promise<ApiServer[]> {
    const { forceReload = false, targetFilter } = options

    if (forceReload) {
      discoveryLogger.info('Force reload requested - reinitializing multiClientManager from config')
      await multiClientManager.reinitialize()
    }

    const targetNames = this.resolveTargetNames(targetFilter)
    if (targetFilter && targetNames.length === 0) {
      discoveryLogger.warn('Target not found', { target: targetFilter })
      return []
    }

    const servers: ApiServer[] = []
    for (const targetName of targetNames) {
      servers.push(await this.discoverTarget(targetName))
    }

    discoveryLogger.info('Discovery completed for all targets', { targetCount: servers.length })
    return servers
  }

  private resolveTargetNames(targetFilter?: string): string[] {
    const allTargetNames = multiClientManager.getTargetNames()
    return targetFilter
      ? allTargetNames.filter(name => name === targetFilter)
      : allTargetNames
  }

  private async discoverTarget(targetName: string): Promise<ApiServer> {
    const targetConfig = multiClientManager.getTargetConfig(targetName)
    const targetAddress = `${targetConfig.host}:${targetConfig.port}`

    try {
      discoveryLogger.info('Discovering services from target', { target: targetName, address: targetAddress })

      const serviceNames = await this.listServices(targetName)
      const services: ApiService[] = []
      for (const serviceName of serviceNames) {
        services.push(await this.describeServiceSafe(targetName, serviceName))
      }

      discoveryLogger.info('Discovery completed for target', { target: targetName, servicesFound: serviceNames.length })
      return { name: targetName, target: targetAddress, services }
    } catch (error) {
      discoveryLogger.error('Failed to discover services from target', { target: targetName, error: errorMessage(error) })
      // Still list the target so the frontend knows it exists but failed.
      return { name: targetName, target: targetAddress, services: [] }
    }
  }

  private async describeServiceSafe(targetName: string, serviceName: string): Promise<ApiService> {
    try {
      return await this.describeService(targetName, serviceName)
    } catch (error) {
      discoveryLogger.warn('Failed to describe service', { target: targetName, service: serviceName, error: errorMessage(error) })
      return { name: serviceName.split('.').pop(), fullName: serviceName, methods: [] }
    }
  }
}

export default new DiscoveryService()
