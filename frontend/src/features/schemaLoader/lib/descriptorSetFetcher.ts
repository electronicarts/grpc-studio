// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * DescriptorSetFetcher - HTTP layer for fetching protobuf descriptors from the backend.
 * Returns DescMessage instances parsed from base64 FileDescriptorSet binaries.
 */
import type { DescMessage } from '@bufbuild/protobuf'
import { apiClient } from '../../../lib/http/apiClient'
import { schemaLogger } from '../../../utils/debugLogger'
import { parseDescriptorIntoMap } from '../../../utils/descUtils'
import type { DescriptorSetRequest, DescriptorSetResponse } from '@grpc-studio/shared'

export async function fetchDescriptorSet(
  targetServer: string,
  messageType: string,
  cacheMap: Map<string, DescMessage>,
): Promise<DescMessage | null> {
  const request: DescriptorSetRequest = { target: targetServer, messageType }
  const res = await apiClient.post<DescriptorSetResponse>('descriptorSet', request, {
    retries: 2,
    onRetry: (attempt, error) => {
      schemaLogger.debug(`Descriptor set retry ${attempt}/2 for ${targetServer}:${messageType}: ${error.message}`)
    },
  })

  // Parse descriptors with scoped keys
  const scopedKey = (mt: string) => `${targetServer}:${mt}`
  const tempMap = new Map<string, DescMessage>()
  parseDescriptorIntoMap(res.descriptorSetBase64, tempMap)

  // Copy into main cache with scoped keys
  for (const [mt, desc] of tempMap.entries()) {
    cacheMap.set(scopedKey(mt), desc)
  }

  return cacheMap.get(scopedKey(messageType)) ?? null
}
