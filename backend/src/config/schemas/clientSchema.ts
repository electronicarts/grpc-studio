// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';
import * as schemaUtils from '../schemaUtils.js';

const ClientObjectSchema = z.object({
  mode: z.enum(['plaintext', 'tls', 'mtls']).default('plaintext'),
  target: schemaUtils.optional(z.object({
    host: schemaUtils.requiredNonEmptyString('client.target.host is required'),
    port: z.coerce.number().int().min(1).max(65535).default(50051),
  })),
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
}).superRefine((client, ctx) => {
  if (client.mode !== 'mtls') return;

  if (!client.security.clientCertPath) {
    ctx.addIssue({
      code: 'custom',
      path: ['security', 'clientCertPath'],
      message: 'mTLS mode requires client.security.clientCertPath',
    });
  }

  if (!client.security.clientKeyPath) {
    ctx.addIssue({
      code: 'custom',
      path: ['security', 'clientKeyPath'],
      message: 'mTLS mode requires client.security.clientKeyPath',
    });
  }
});

export const ClientSchema = schemaUtils.optional(ClientObjectSchema);

export type ClientConfig = z.infer<typeof ClientSchema>;
