// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Repository-owned cache and lookup point for schema metadata discovered
 * through gRPC reflection.
 */

import { createFileRegistry, type FileRegistry } from '@bufbuild/protobuf'
import type { FileDescriptorSet } from '@bufbuild/protobuf/wkt'
import * as reflectionClient from '../grpc/reflection/reflectionClient.js'
import * as descriptorSetFromReflection from '../grpc/reflection/descriptorSetFromReflection.js'
import * as reflectionMetadataCache from '../cache/reflectionMetadataCache.js'
import logger from '../utils/logger.js'

const repositoryLogger = logger.child({ module: 'reflection-schema-repository' })

const SERVICE_NAMES_CACHE_KEY = 'service-names'

// Key: the constant 'service-names'.
// Value: reflected service names, for example ['grpc.health.v1.Health', 'package.UserService'].
// Why TTL: the target server can deploy new services while the backend is
// running, so the service list should refresh without requiring a restart.
// The key does not include host because this backend process has one configured
// gRPC target. If runtime target switching is added, clear this cache on switch.
const serviceNamesCache = reflectionMetadataCache.createReflectionMetadataCache<string[]>()

// Key: reflected symbol, for example 'package.UserService'.
// Value: the FileDescriptorSet containing service and message descriptors for that symbol.
// Why TTL: proto descriptors can change after a target redeploy, and cached
// message shapes need to age out so requests/responses use the current schema.
// The key does not include host because this backend process has one configured
// gRPC target. If runtime target switching is added, clear this cache on switch.
const fileDescriptorSetCache = reflectionMetadataCache.createReflectionMetadataCache<FileDescriptorSet>()

// Key: reflected symbol, for example 'package.UserService'.
// Value: a FileRegistry built from the cached descriptor set for that symbol.
// Why TTL: FileRegistry is derived from descriptors, so it should refresh when
// reflected message definitions change on the target server.
// The key does not include host because this backend process has one configured
// gRPC target. If runtime target switching is added, clear this cache on switch.
const fileRegistryCache = reflectionMetadataCache.createReflectionMetadataCache<FileRegistry>()

export class ReflectionSchemaRepository {
  async listServices(): Promise<string[]> {
    const host = reflectionClient.getConfiguredHost()
    repositoryLogger.info('Listing services', { host })

    const cachedServiceNames = serviceNamesCache.get(SERVICE_NAMES_CACHE_KEY)
    if (cachedServiceNames !== undefined) {
      repositoryLogger.debug('Using cached service list')
      return cachedServiceNames
    }

    try {
      const client = await reflectionClient.createReflectionClient(host)
      const services = await client.listServices('*', reflectionClient.getReflectionCallOptions())
      const filtered = services.filter(serviceName => !serviceName.startsWith('grpc.'))

      serviceNamesCache.set(SERVICE_NAMES_CACHE_KEY, filtered)
      repositoryLogger.info('Found services', { count: filtered.length })

      return filtered
    } catch (error) {
      repositoryLogger.error('Failed to list services', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async getFileDescriptorSet(symbol: string): Promise<FileDescriptorSet> {
    const host = reflectionClient.getConfiguredHost()
    const cached = fileDescriptorSetCache.get(symbol)
    if (cached !== undefined) {
      repositoryLogger.debug('Using cached FileDescriptorSet', { symbol })
      return cached
    }

    repositoryLogger.info('Building FileDescriptorSet', { host, symbol })

    try {
      const client = await reflectionClient.createReflectionClient(host)
      const fileDescriptorSet = await descriptorSetFromReflection.buildFileDescriptorSet(
        client,
        symbol,
        reflectionClient.getReflectionCallOptions()
      )

      fileDescriptorSetCache.set(symbol, fileDescriptorSet)
      repositoryLogger.debug('Built FileDescriptorSet', { symbol, files: fileDescriptorSet.file.length })

      return fileDescriptorSet
    } catch (error) {
      repositoryLogger.error('Failed to build FileDescriptorSet', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async getFileRegistry(symbol: string): Promise<FileRegistry> {
    const cached = fileRegistryCache.get(symbol)
    if (cached !== undefined) {
      repositoryLogger.debug('Using cached FileRegistry', { symbol })
      return cached
    }

    try {
      const fileDescriptorSet = await this.getFileDescriptorSet(symbol)
      const registry = createFileRegistry(fileDescriptorSet)

      fileRegistryCache.set(symbol, registry)
      repositoryLogger.debug('Built FileRegistry', { symbol })

      return registry
    } catch (error) {
      repositoryLogger.error('Failed to build FileRegistry', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  clearCache(): void {
    serviceNamesCache.clear()
    fileDescriptorSetCache.clear()
    fileRegistryCache.clear()
    reflectionClient.clearReflectionVersionCache()
    repositoryLogger.info('Cleared reflection schema cache')
  }
}

export const reflectionSchemaRepository = new ReflectionSchemaRepository()
export default reflectionSchemaRepository
