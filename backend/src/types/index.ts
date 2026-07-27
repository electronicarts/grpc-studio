// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { InvokeUnaryResponse, JsonValue } from '@grpc-studio/shared';

export type { ApiMethod, ApiService,  } from '@grpc-studio/shared';
export type {
  CertificateMetadata,
} from './certificate.js';

/** Authenticated user context, extracted from SSO proxy headers. */
export interface UserContext {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  authenticated: boolean;
}

/** Result of a certificate validity check. */
export interface CertCheckResult {
  valid: boolean;
  error?: string;
  daysRemaining?: number;
  expiryDate?: Date;
  subject?: string;
}

/** Formatted gRPC error returned to callers. */
export interface FormattedGrpcError {
  code?: number;
  codeName?: string;
  message?: string;
  formatted: string;
}

/** Callbacks passed to streaming gRPC invoke methods. */
export interface StreamCallbacks {
  onData: (data: JsonValue) => void;
  onEnd: () => void;
  onError: (error: FormattedGrpcError) => void;
}

/** Handle returned by streaming invoke methods. */
export interface StreamHandle {
  cancel: () => void;
}

/** Unary gRPC invocation result. */
export type UnaryResult = InvokeUnaryResponse;

/** Auth plugin validation result. */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Plugin metadata descriptor. */
export interface PluginMetadata {
  name: string;
  description: string;
  [key: string]: unknown;
}
