// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

export const CacheSchema = schemaUtils.optional(z.object({
  reflection: schemaUtils.optional(z.object({
    ttlMs: z.coerce.number().int().positive().default(3600000),
    maxEntries: z.coerce.number().int().positive().default(1000),
  })),
  certificate: schemaUtils.optional(z.object({
    ttlMs: z.coerce.number().int().positive().default(60000),
    maxEntries: z.coerce.number().int().positive().default(1),
  })),
}));

export type CacheConfig = z.infer<typeof CacheSchema>;
