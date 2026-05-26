// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { z } from 'zod';

/** Wrap a nested object schema so a missing YAML section falls back to `{}` and applies field defaults. */
export function optional<T>(schema: z.ZodType<T>) {
  return z.preprocess((v) => v ?? {}, schema);
}

/** Require a non-empty string while producing the same message for missing and blank values. */
export function requiredNonEmptyString(message: string) {
  return z.preprocess((v) => v ?? '', z.string().trim().min(1, message));
}
