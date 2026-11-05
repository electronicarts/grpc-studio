// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod'
import * as serverSchema from '#src/config/schemas/serverSchema.js'
import * as clientSchema from '#src/config/schemas/clientSchema.js'
import * as authSchema from '#src/config/schemas/authSchema.js'
import * as cacheSchema from '#src/config/schemas/cacheSchema.js'
import * as healthSchema from '#src/config/schemas/healthSchema.js'
import * as certificateSchema from '#src/config/schemas/certificateSchema.js'
import * as observabilitySchema from '#src/config/schemas/observabilitySchema.js'

export const AppConfigSchema = z.object({
  server: serverSchema.ServerSchema,
  client: clientSchema.ClientSchema,
  auth: authSchema.AuthSchema,
  cache: cacheSchema.CacheSchema,
  health: healthSchema.HealthSchema,
  certificate: certificateSchema.CertificateSchema,
  observability: observabilitySchema.ObservabilitySchema,
})

export type AppConfig = z.infer<typeof AppConfigSchema>

export type { ServerConfig } from '#src/config/schemas/serverSchema.js'
export type { ClientConfig } from '#src/config/schemas/clientSchema.js'
export type { AuthConfig } from '#src/config/schemas/authSchema.js'
export type { CacheConfig } from '#src/config/schemas/cacheSchema.js'
export type { HealthConfig } from '#src/config/schemas/healthSchema.js'
export type { CertificateConfig } from '#src/config/schemas/certificateSchema.js'
export type { ObservabilityConfig } from '#src/config/schemas/observabilitySchema.js'
