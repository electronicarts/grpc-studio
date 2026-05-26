// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * DiscoveryService uses gRPC reflection to list services and describe their
 * methods.
 */

import reflectionSchemaRepository, { type ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import logger from '../utils/logger.js'
import type { ApiMethod, ApiService } from '../types/index.js'

const discoveryLogger = logger.child({ module: 'native-service-discovery' })

export class DiscoveryService {
  constructor(private readonly schemaRepository: ReflectionSchemaRepository = reflectionSchemaRepository) {}

  async listServices() {
    return this.schemaRepository.listServices()
  }

  async describeService(serviceName: string) {
    discoveryLogger.info('Describing service', { service: serviceName })

    try {
      const registry = await this.schemaRepository.getFileRegistry(serviceName)
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

      discoveryLogger.info('Described service', { methods: methods.length })

      return description
    } catch (error) {
      discoveryLogger.error('Failed to describe service', { service: serviceName, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

}

export default new DiscoveryService()
