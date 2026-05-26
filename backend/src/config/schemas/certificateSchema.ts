// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

export const CertificateSchema = schemaUtils.optional(z.object({
  certReadTimeoutMs: z.coerce.number().int().positive().default(5000),
  warnDaysCritical: z.coerce.number().int().positive().default(7),
  warnDaysWarning: z.coerce.number().int().positive().default(30),
}));

export type CertificateConfig = z.infer<typeof CertificateSchema>;
