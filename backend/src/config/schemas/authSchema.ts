// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

export const AuthSchema = schemaUtils.optional(z.object({
  plugins: z.record(
    z.string(),
    z.object({
      enabled: z.boolean().default(false),
      config: z.record(z.string(), z.unknown()).optional(),
    }),
  ).default({}),
}));

export type AuthConfig = z.infer<typeof AuthSchema>;
