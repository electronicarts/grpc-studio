// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Extract a human-readable message from an unknown thrown value.
 * Replaces the repeated `error instanceof Error ? error.message : String(error)` idiom.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
