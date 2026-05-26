// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

export const ServerSchema = schemaUtils.optional(z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  host: schemaUtils.requiredNonEmptyString('server.host is required'),
  shutdownGracePeriodMs: z.coerce.number().int().positive().default(10000),
  cors: schemaUtils.optional(z.object({
    enabled: z.boolean().default(true),
    origins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:4173']),
  })),
  http: schemaUtils.optional(z.object({
    responseTimeoutMs: z.coerce.number().int().positive().default(30000),
    bodyLimitBytes: z.coerce.number().int().positive().default(10485760),
  })),
  websocket: schemaUtils.optional(z.object({
    maxConnections: z.coerce.number().int().positive().default(100),
    maxPayloadBytes: z.coerce.number().int().positive().default(10485760),
    heartbeatIntervalMs: z.coerce.number().int().positive().default(25000),
  })),
}));

export type ServerConfig = z.infer<typeof ServerSchema>;
