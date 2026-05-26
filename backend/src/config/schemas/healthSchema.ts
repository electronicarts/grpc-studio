// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

export const HealthSchema = schemaUtils.optional(z.object({
  enabled: z.boolean().default(true),
  endpoint: z.string().default('/health'),
}));

export type HealthConfig = z.infer<typeof HealthSchema>;
