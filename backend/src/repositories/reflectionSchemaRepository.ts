// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Repository-owned cache and lookup point for schema metadata discovered
 * through gRPC reflection.
 */

import { createFileRegistry, type FileRegistry, create } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema, type FileDescriptorSet } from '@bufbuild/protobuf/wkt'
import * as descriptorSetFromReflection from '../grpc/reflection/descriptorSetFromReflection.js'
import * as reflectionMetadataCache from '../cache/reflectionMetadataCache.js'
import multiClientManager from '../grpc/multiClientManager.js'
import logger from '../utils/logger.js'

const repositoryLogger = logger.child({ module: 'reflection-schema-repository' })

// Keys are now scoped by target: `${targetName}:service-names` or `${targetName}:${symbol}`
const serviceNamesCache = reflectionMetadataCache.createReflectionMetadataCache<string[]>()
const fileDescriptorSetCache = reflectionMetadataCache.createReflectionMetadataCache<FileDescriptorSet>()
const fileRegistryCache = reflectionMetadataCache.createReflectionMetadataCache<FileRegistry>()

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
        error: error instanceof Error ? error.message : String(error),
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
      const fileDescriptorSet = await descriptorSetFromReflection.buildFileDescriptorSet(
        client,
        symbol,
        callOptions
      )

      fileDescriptorSetCache.set(cacheKey, fileDescriptorSet)
      repositoryLogger.debug('Built FileDescriptorSet', { target, symbol, files: fileDescriptorSet.file.length })

      return fileDescriptorSet
    } catch (error) {
      repositoryLogger.error('Failed to build FileDescriptorSet', {
        target,
        symbol,
        error: error instanceof Error ? error.message : String(error),
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
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async getAllFileDescriptorSet(target: string): Promise<FileDescriptorSet> {
    // Build a FileDescriptorSet containing ALL files from ALL services for a target.
    // This is used for building a comprehensive registry for Any field decoding,
    // since Any can contain messages from any reflected service.
    const services = await this.listServices(target)
    const allDescriptorSets: FileDescriptorSet[] = []

    for (const serviceName of services) {
      try {
        const descriptorSet = await this.getFileDescriptorSet(target, serviceName)
        allDescriptorSets.push(descriptorSet)
      } catch (error) {
        repositoryLogger.warn('Failed to get descriptor set for service, skipping', {
          target,
          serviceName,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Merge all files from all descriptor sets, deduplicating by file name.
    // Services commonly share files (e.g. common.proto, well-known types); passing a
    // set with duplicate file names to createFileRegistry throws, so we keep the first
    // occurrence of each name.
    const filesByName = new Map<string, (typeof allDescriptorSets)[number]['file'][number]>()
    for (const descriptorSet of allDescriptorSets) {
      for (const file of descriptorSet.file) {
        if (!filesByName.has(file.name)) {
          filesByName.set(file.name, file)
        }
      }
    }

    // Create a proper FileDescriptorSet instance using @bufbuild/protobuf's create helper
    return create(FileDescriptorSetSchema, { file: Array.from(filesByName.values()) })
  }

  clearCache(target?: string): void {
    if (target) {
      // Every key is scoped as `${target}:...` (see scopedKey), so we can clear a
      // single target's entries by deleting every key with that prefix.
      const prefix = `${target}:`
      let cleared = 0
      for (const cache of [serviceNamesCache, fileDescriptorSetCache, fileRegistryCache]) {
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
      repositoryLogger.info('Cleared all reflection schema caches')
    }
  }
}

const reflectionSchemaRepository = new ReflectionSchemaRepository()
export default reflectionSchemaRepository
