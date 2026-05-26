// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod'

export const ObservabilityConfigSchema = z.object({
  enabled: z.boolean().default(true),

  metrics: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/metrics'),
    includeSystemMetrics: z.boolean().default(true),
    defaultLabels: z.record(z.string(), z.string()).optional(),
  }).optional(),

  tracing: z.object({
    enabled: z.boolean().default(false),
    serviceName: z.string().default('grpc-studio'),
    exporter: z.enum(['console', 'otlp']).default('console'),
    otlpEndpoint: z.string().url().optional(),
    sampleRate: z.number().min(0).max(1).default(1.0),
  }).optional(),

  performance: z.object({
    trackSlowOperations: z.boolean().default(true),
    slowThresholdMs: z.number().positive().default(1000),
  }).optional(),
})

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>
