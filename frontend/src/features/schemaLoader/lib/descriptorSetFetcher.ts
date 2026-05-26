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
  messageType: string,
  target: Map<string, DescMessage>,
): Promise<DescMessage | null> {
  const request: DescriptorSetRequest = { messageType }
  const res = await apiClient.post<DescriptorSetResponse>('descriptorSet', request, {
    retries: 2,
    onRetry: (attempt, error) => {
      schemaLogger.debug(`Descriptor set retry ${attempt}/2 for ${messageType}: ${error.message}`)
    },
  })
  parseDescriptorIntoMap(res.descriptorSetBase64, target)
  return target.get(messageType) ?? null
}
