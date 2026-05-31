// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Dynamic registry builder that combines well-known types with reflected schemas.
 * This enables google.protobuf.Any fields to contain custom message types discovered
 * via reflection, not just WKTs.
 */

import { createRegistry, createFileRegistry, type DescMessage, type FileDescriptorSet, type Registry } from '@bufbuild/protobuf'
import * as wkt from '@bufbuild/protobuf/wkt'
import logger from '../../utils/logger.js'

const registryLogger = logger.child({ module: 'dynamic-registry' })

// Static registry containing all well-known types
const wktRegistry: Registry = createRegistry(
  ...(Object.values(wkt).filter(
    (v) => typeof v === 'object' && v !== null && 'typeName' in v && 'fields' in v
  ) as DescMessage[])
)

/**
 * Builds a Registry containing both WKTs and all message types from the given FileDescriptorSet.
 * This registry can be passed to fromJson/toJson so google.protobuf.Any fields can contain
 * custom types discovered through reflection.
 */
export function buildDynamicRegistry(fileDescriptorSet: FileDescriptorSet): Registry {
  const messageDescriptors: DescMessage[] = []

  // Parse the raw FileDescriptorSet into a FileRegistry to get DescFile/DescMessage objects
  const fileRegistry = createFileRegistry(fileDescriptorSet)

  // Extract all message descriptors from the parsed FileRegistry
  for (const file of fileRegistry.files) {
    for (const message of file.messages) {
      messageDescriptors.push(message)
    }
  }

  registryLogger.debug('Building dynamic registry', {
    wktCount: Array.from(wktRegistry).length,
    reflectedCount: messageDescriptors.length,
  })

  // Create a combined registry with WKTs + reflected types
  return createRegistry(...Array.from(wktRegistry), ...messageDescriptors)
}

/**
 * Returns the base WKT-only registry for cases where no FileRegistry is available.
 */
export function getWktRegistry(): Registry {
  return wktRegistry
}
