// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Repository-owned cache and lookup point for schema metadata discovered
 * through gRPC reflection.
 */

import { createFileRegistry, type FileRegistry, type Registry } from '@bufbuild/protobuf'
import type { FileDescriptorSet } from '@bufbuild/protobuf/wkt'
import * as descriptorSetFromReflection from '#src/grpc/reflection/descriptorSetFromReflection.js'
import * as reflectionMetadataCache from '#src/cache/reflectionMetadataCache.js'
import multiClientManager from '#src/grpc/multiClientManager.js'
import { withWellKnownTypes } from '@grpc-studio/shared'
import logger from '#src/utils/logger.js'
import { errorMessage } from '#src/utils/errorMessage.js'

const repositoryLogger = logger.child({ module: 'reflection-schema-repository' })

// Keys are now scoped by target: `${targetName}:service-names` or `${targetName}:${symbol}`
const serviceNamesCache = reflectionMetadataCache.createReflectionMetadataCache<string[]>()
const fileDescriptorSetCache = reflectionMetadataCache.createReflectionMetadataCache<FileDescriptorSet>()
const fileRegistryCache = reflectionMetadataCache.createReflectionMetadataCache<FileRegistry>()
const targetRegistryCache = reflectionMetadataCache.createReflectionMetadataCache<Registry>()

function scopedKey(target: string, key: string): string {
  return `${target}:${key}`
}

export class ReflectionSchemaRepository {
  async listServices(target: string): Promise<string[]> {
    const cacheKey = scopedKey(target, 'service-names')
    const cachedServiceNames = serviceNamesCache.get(cacheKey)

    if (cachedServiceNames !== undefined) {
      repositoryLogger.debug('Using cached service list', { target })
      return cachedServiceNames
    }

    try {
      const client = await multiClientManager.getReflectionClient(target)
      const targetConfig = multiClientManager.getTargetConfig(target)
      const host = `${targetConfig.host}:${targetConfig.port}`

      repositoryLogger.info('Listing services', { target, host })
      const callOptions = await multiClientManager.getReflectionCallOptions(target)
      const services = await client.listServices('*', callOptions)
      const filtered = services.filter(serviceName => !serviceName.startsWith('grpc.'))

      serviceNamesCache.set(cacheKey, filtered)
      repositoryLogger.info('Found services', { target, count: filtered.length })

      return filtered
    } catch (error) {
      repositoryLogger.error('Failed to list services', {
        target,
        error: errorMessage(error),
      })
      throw error
    }
  }

  async getFileDescriptorSet(target: string, symbol: string): Promise<FileDescriptorSet> {
    const cacheKey = scopedKey(target, symbol)
    const cached = fileDescriptorSetCache.get(cacheKey)

    if (cached !== undefined) {
      repositoryLogger.debug('Using cached FileDescriptorSet', { target, symbol })
      return cached
    }

    const targetConfig = multiClientManager.getTargetConfig(target)
    const host = `${targetConfig.host}:${targetConfig.port}`
    repositoryLogger.info('Building FileDescriptorSet', { target, host, symbol })

    try {
      const client = await multiClientManager.getReflectionClient(target)
      const callOptions = await multiClientManager.getReflectionCallOptions(target)
      const fileDescriptorSet = await descriptorSetFromReflection.buildFileDescriptorSet(client, symbol, callOptions)

      fileDescriptorSetCache.set(cacheKey, fileDescriptorSet)
      repositoryLogger.debug('Built FileDescriptorSet', { target, symbol, files: fileDescriptorSet.file.length })

      return fileDescriptorSet
    } catch (error) {
      repositoryLogger.error('Failed to build FileDescriptorSet', {
        target,
        symbol,
        error: errorMessage(error),
      })
      throw error
    }
  }

  async getFileRegistry(target: string, symbol: string): Promise<FileRegistry> {
    const cacheKey = scopedKey(target, `registry:${symbol}`)
    const cached = fileRegistryCache.get(cacheKey)

    if (cached !== undefined) {
      repositoryLogger.debug('Using cached FileRegistry', { target, symbol })
      return cached
    }

    try {
      const fileDescriptorSet = await this.getFileDescriptorSet(target, symbol)
      const registry = createFileRegistry(fileDescriptorSet)

      fileRegistryCache.set(cacheKey, registry)
      repositoryLogger.debug('Built FileRegistry', { target, symbol })

      return registry
    } catch (error) {
      repositoryLogger.error('Failed to build FileRegistry', {
        target,
        symbol,
        error: errorMessage(error),
      })
      throw error
    }
  }

  /**
   * One registry with every type from every service on a target, plus the WKTs. Any fields can hold messages
   * from any reflected service, so requests and responses are converted with this. Built by merging the
   * per-service registries (already cached) and cached itself, so calls don't rebuild it.
   */
  async getTargetRegistry(target: string): Promise<Registry> {
    const cacheKey = scopedKey(target, 'target-registry')
    const cached = targetRegistryCache.get(cacheKey)
    if (cached !== undefined) return cached

    // Services are independent, so look them up concurrently; one that fails is skipped
    const serviceNames = await this.listServices(target)
    const results = await Promise.allSettled(serviceNames.map(serviceName => this.getFileRegistry(target, serviceName)))
    const serviceRegistries: FileRegistry[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        serviceRegistries.push(result.value)
        return
      }
      repositoryLogger.warn('Failed to get registry for service, skipping', {
        target,
        serviceName: serviceNames[index],
        error: errorMessage(result.reason),
      })
    })

    const registry = withWellKnownTypes(...serviceRegistries)
    targetRegistryCache.set(cacheKey, registry)
    repositoryLogger.debug('Built target registry', { target, services: serviceRegistries.length })
    return registry
  }

  clearCache(target?: string): void {
    if (target) {
      // Every key is scoped as `${target}:...` (see scopedKey), so we can clear a
      // single target's entries by deleting every key with that prefix.
      const prefix = `${target}:`
      let cleared = 0
      for (const cache of [serviceNamesCache, fileDescriptorSetCache, fileRegistryCache, targetRegistryCache]) {
        for (const key of [...cache.keys()]) {
          if (key.startsWith(prefix)) {
            cache.delete(key)
            cleared++
          }
        }
      }
      repositoryLogger.info('Cleared reflection schema cache for target', { target, entries: cleared })
    } else {
      // Clear all caches
      serviceNamesCache.clear()
      fileDescriptorSetCache.clear()
      fileRegistryCache.clear()
      targetRegistryCache.clear()
      repositoryLogger.info('Cleared all reflection schema caches')
    }
  }
}

const reflectionSchemaRepository = new ReflectionSchemaRepository()
export default reflectionSchemaRepository
