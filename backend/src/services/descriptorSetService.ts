// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * DescriptorSetService serializes cached reflection schema metadata for the
 * descriptor-set API.
 *
 * Reflection fetching and dependency resolution live in ReflectionSchemaRepository.
 * This service only validates that the requested symbol is present and returns a
 * base64-encoded google.protobuf.FileDescriptorSet for the frontend.
 */

import { toBinary } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import reflectionSchemaRepository, { type ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import logger from '../utils/logger.js'
const descriptorSetLogger = logger.child({ module: 'descriptor-set-service' })

export class DescriptorSetService {
  constructor(private readonly schemaRepository: ReflectionSchemaRepository = reflectionSchemaRepository) {}

  /** Returns a base64-encoded FileDescriptorSet for `messageType` from the specified target. */
  async getDescriptorSetBase64(target: string, messageType: string): Promise<string> {
    descriptorSetLogger.info('Loading descriptor set', { target, messageType })

    try {
      const fileDescriptorSet = await this.schemaRepository.getFileDescriptorSet(target, messageType)
      const registry = await this.schemaRepository.getFileRegistry(target, messageType)
      if (!registry.getMessage(messageType) && !registry.getService(messageType)) {
        descriptorSetLogger.warn(`Symbol '${messageType}' not found after resolving descriptors`, { target })
      }

      const binary = toBinary(FileDescriptorSetSchema, fileDescriptorSet)
      const descriptorSetBase64 = Buffer.from(binary).toString('base64')

      descriptorSetLogger.info('Serialized descriptor set', { target, messageType, bytes: Math.round(descriptorSetBase64.length * 0.75) })
      return descriptorSetBase64
    } catch (error) {
      descriptorSetLogger.error('Failed to serialize descriptor set', {
        target,
        error: error instanceof Error ? error.message : String(error),
        messageType,
      })
      throw error
    }
  }

}

export default new DescriptorSetService()
