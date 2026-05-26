// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod'
import * as schemaUtils from '../schemaUtils.js'

export const ObservabilitySchema = schemaUtils.optional(z.object({
  enabled: z.boolean().default(true),

  metrics: schemaUtils.optional(z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/metrics'),
    includeSystemMetrics: z.boolean().default(true),
    defaultLabels: z.record(z.string(), z.string()).optional(),
  })),

  performance: schemaUtils.optional(z.object({
    trackSlowOperations: z.boolean().default(true),
    slowThresholdMs: z.number().positive().default(1000),
  })),
}))

export type ObservabilityConfig = z.infer<typeof ObservabilitySchema>
export type MetricsConfig = ObservabilityConfig['metrics']
export type PerformanceConfig = ObservabilityConfig['performance']
