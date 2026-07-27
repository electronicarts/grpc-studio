// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

const TargetConfigSchema = z.object({
  name: schemaUtils.requiredNonEmptyString('target.name is required'),
  mode: z.enum(['plaintext', 'tls', 'mtls']).default('plaintext'),
  host: schemaUtils.requiredNonEmptyString('target.host is required'),
  port: z.coerce.number().int().min(1).max(65535).default(50051),
  rpc: schemaUtils.optional(z.object({
    unaryDeadlineMs: z.coerce.number().int().positive().default(30000),
    streamDeadlineMs: z.coerce.number().int().positive().default(120000),
  })),
  reflection: schemaUtils.optional(z.object({
    deadlineMs: z.coerce.number().int().positive().default(25000),
  })),
  keepalive: schemaUtils.optional(z.object({
    pingIntervalMs: z.coerce.number().int().positive().default(30000),
    pingTimeoutMs: z.coerce.number().int().positive().default(10000),
  })),
  maxReceiveMessageBytes: z.coerce.number().int().positive().default(104857600),
  security: schemaUtils.optional(z.object({
    clientCertPath: z.string().default(''),
    clientKeyPath: z.string().default(''),
    caCertPath: z.string().default(''),
  })),
}).superRefine((target, ctx) => {
  if (target.mode !== 'mtls') return;

  if (!target.security.clientCertPath) {
    ctx.addIssue({
      code: 'custom',
      path: ['security', 'clientCertPath'],
      message: 'mTLS mode requires security.clientCertPath',
    });
  }

  if (!target.security.clientKeyPath) {
    ctx.addIssue({
      code: 'custom',
      path: ['security', 'clientKeyPath'],
      message: 'mTLS mode requires security.clientKeyPath',
    });
  }
});

const ClientObjectSchema = z.object({
  targets: z.array(TargetConfigSchema).min(1, 'At least one target is required'),
});

export const ClientSchema = schemaUtils.optional(ClientObjectSchema);

export type ClientConfig = z.infer<typeof ClientSchema>;
export type TargetConfig = z.infer<typeof TargetConfigSchema>;
