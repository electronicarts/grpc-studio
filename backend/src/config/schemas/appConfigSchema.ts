// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as serverSchema from './serverSchema.js';
import * as clientSchema from './clientSchema.js';
import * as authSchema from './authSchema.js';
import * as cacheSchema from './cacheSchema.js';
import * as healthSchema from './healthSchema.js';
import * as certificateSchema from './certificateSchema.js';
import * as observabilitySchema from './observabilitySchema.js';

export const AppConfigSchema = z.object({
  server:      serverSchema.ServerSchema,
  client:      clientSchema.ClientSchema,
  auth:        authSchema.AuthSchema,
  cache:       cacheSchema.CacheSchema,
  health:      healthSchema.HealthSchema,
  certificate: certificateSchema.CertificateSchema,
  observability: observabilitySchema.ObservabilitySchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export type { ServerConfig } from './serverSchema.js';
export type { ClientConfig } from './clientSchema.js';
export type { AuthConfig } from './authSchema.js';
export type { CacheConfig } from './cacheSchema.js';
export type { HealthConfig } from './healthSchema.js';
export type { CertificateConfig } from './certificateSchema.js';
export type { ObservabilityConfig } from './observabilitySchema.js';
