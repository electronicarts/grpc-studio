// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * User-supplied gRPC request metadata (custom headers) sent along with an RPC.
 * Keys are ASCII header names; values are ASCII header values. The backend
 * merges these onto the outbound gRPC call, but auth/identity headers always
 * take precedence over user-supplied entries with the same key.
 */
export type RequestMetadata = Record<string, string>

/**
 * gRPC metadata key grammar (see grpc-js / HTTP/2 header rules): a non-empty
 * sequence of lowercase letters, digits, and the punctuation `-`, `_`, `.`.
 * Keys are case-insensitive on the wire; we lowercase before validating so the
 * UI can accept e.g. `X-Api-Key`.
 */
const METADATA_KEY_RE = /^[0-9a-z_.-]+$/

// gRPC header values are transmitted as ASCII. Reject control characters
// (except no control chars at all) and non-ASCII so we fail fast in the UI
// rather than letting the transport throw an opaque error.
// eslint-disable-next-line no-control-regex
const METADATA_VALUE_RE = /^[\x20-\x7E]*$/

// Keys ending in `-bin` carry base64-encoded binary values in gRPC. We don't
// support editing binary metadata from the UI, so reject them explicitly.
function isBinaryMetadataKey(key: string): boolean {
  return key.endsWith('-bin')
}

export interface RequestMetadataValidationResult {
  ok: boolean
  /** Sanitized metadata (keys lowercased, entries with empty key/value dropped). */
  metadata: RequestMetadata
  /** Human-readable reason the input was rejected, when ok is false. */
  error?: string
}

/**
 * Validate and sanitize a user-supplied metadata map. Entries with an empty
 * key are dropped (they represent partially-filled UI rows). Keys are
 * lowercased. Returns ok: false with a message on the first invalid entry.
 */
export function sanitizeRequestMetadata(input: unknown): RequestMetadataValidationResult {
  if (input == null) return { ok: true, metadata: {} }

  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, metadata: {}, error: 'metadata must be an object of string keys and values' }
  }

  const metadata: RequestMetadata = {}
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const key = rawKey.trim().toLowerCase()
    if (key === '') continue

    if (typeof rawValue !== 'string') {
      return { ok: false, metadata: {}, error: `metadata value for "${rawKey}" must be a string` }
    }

    if (!METADATA_KEY_RE.test(key)) {
      return { ok: false, metadata: {}, error: `invalid metadata key "${rawKey}": only letters, digits, and -_. are allowed` }
    }

    if (isBinaryMetadataKey(key)) {
      return { ok: false, metadata: {}, error: `binary metadata key "${rawKey}" (ending in -bin) is not supported` }
    }

    if (!METADATA_VALUE_RE.test(rawValue)) {
      return { ok: false, metadata: {}, error: `invalid metadata value for "${rawKey}": only printable ASCII is allowed` }
    }

    metadata[key] = rawValue
  }

  return { ok: true, metadata }
}
