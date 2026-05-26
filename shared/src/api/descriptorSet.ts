// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * POST /api/grpc/descriptor-set
 * Request body: message type to load.
 * Response body: descriptor set for that message and its transitive dependencies.
 */
export interface DescriptorSetRequest {
  messageType: string
}

export interface DescriptorSetResponse {
  messageType: string
  descriptorSetBase64: string
}
