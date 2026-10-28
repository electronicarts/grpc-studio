// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export { withWellKnownTypes } from '#src/protobuf/wellKnownTypesRegistry.js'

export { MethodKind, METHOD_KINDS, STREAMING_METHOD_KINDS } from '#src/api/methodKind.js'

export type { JsonObject, JsonValue } from '#src/api/json.js'

export { isJsonValue } from '#src/api/json.js'

export type { StreamingMethodKind } from '#src/api/methodKind.js'

export { HealthStatus, HEALTH_STATUSES } from '#src/api/health.js'

export type { RootRequest, RootResponse } from '#src/api/root.js'

export type {
  HealthRequest,
  HealthResponse,
  ReadinessRequest,
  ReadinessReadyResponse,
  ReadinessNotReadyResponse,
  ReadinessResponse,
  LivenessRequest,
  LivenessResponse,
} from '#src/api/health.js'

export type { ApiErrorInfo, ApiErrorResponse, NotFoundResponse } from '#src/api/error.js'

export type { ApiMethod, ApiService, ApiServer, DiscoveryRequest, DiscoveryResponse } from '#src/api/discovery.js'

export type { DescriptorSetRequest, DescriptorSetResponse } from '#src/api/descriptorSet.js'

export type {
  InvokeUnaryRequest,
  InvokeUnarySuccessResponse,
  InvokeUnaryErrorResponse,
  InvokeUnaryResponse,
} from '#src/api/invocation.js'

export type { RequestMetadata, RequestMetadataValidationResult } from '#src/api/metadata.js'

export { sanitizeRequestMetadata } from '#src/api/metadata.js'

export type { ConfigRequest, PublicConfig, ConfigResponse } from '#src/api/config.js'

export type { StatusRequest, StatusResponse, ServerStatus } from '#src/api/status.js'

export type {
  CertificateRequest,
  CertificateReadableInfo,
  CertificateUnreadableInfo,
  CertificateInfo,
  CertificateNotConfiguredResponse,
  CertificateConfiguredResponse,
  CertificateResponse,
} from '#src/api/certificate.js'

export { CertificateStatus, CERTIFICATE_STATUSES } from '#src/api/certificate.js'

export type {
  InvokeStreamUserHeaders,
  InvokeStreamStartPayload,
  InvokeStreamPingRequest,
  InvokeStreamStartRequest,
  InvokeStreamDataRequest,
  InvokeStreamEndRequest,
  InvokeStreamCancelRequest,
  InvokeStreamClientMessage,
  InvokeStreamDataResponse,
  InvokeStreamErrorResponse,
  InvokeStreamCompleteResponse,
  InvokeStreamPongResponse,
  InvokeStreamResponse,
} from '#src/api/websocket.js'
