// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shareable link utilities for gRPC Studio.
 *
 * Encodes the current request state (service, method, request body, and
 * request metadata) into a URL-safe base64 hash fragment. Recipients can
 * open the link and the request is restored automatically.
 *
 * Format: #share=<base64url(JSON({s, m, r, md?}))>
 *   s  = service fullName
 *   m  = method name
 *   r  = request body (object)
 *   md = request metadata (optional; map of string keys to string values)
 */

import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire'
import { sanitizeRequestMetadata, type RequestMetadata } from '@grpc-studio/shared'

export interface SharedRequestState {
  /** Service fullName, e.g. "package.ServiceName" */
  s: string
  /** Method name */
  m: string
  /** Request body (parsed object) */
  r: Record<string, unknown>
  /** Request metadata (custom gRPC headers), omitted when empty */
  md?: RequestMetadata
}

const SHARE_PREFIX = 'share='

/**
 * Build a shareable URL for the current request.
 */
export function buildShareableUrl(
  serviceFullName: string,
  methodName: string,
  requestBody: Record<string, unknown>,
  metadata?: RequestMetadata | null,
): string {
  const payload: SharedRequestState = {
    s: serviceFullName,
    m: methodName,
    r: requestBody,
    ...(metadata && Object.keys(metadata).length > 0 ? { md: metadata } : {}),
  }
  const json = JSON.stringify(payload)
  const encoded = base64Encode(new TextEncoder().encode(json), 'url')

  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#${SHARE_PREFIX}${encoded}`
}

/**
 * Parse a shared request state from the current URL hash.
 * Returns null if no valid share fragment is present.
 */
export function parseShareableUrl(): SharedRequestState | null {
  const hash = window.location.hash.slice(1) // remove leading #
  if (!hash.startsWith(SHARE_PREFIX)) return null

  const encoded = hash.slice(SHARE_PREFIX.length)
  try {
    // base64Decode accepts the URL-safe, unpadded variant directly
    const json = new TextDecoder('utf-8', { fatal: true }).decode(base64Decode(encoded))
    const payload = JSON.parse(json) as SharedRequestState

    if (
      typeof payload.s !== 'string' ||
      typeof payload.m !== 'string' ||
      typeof payload.r !== 'object' ||
      payload.r === null
    ) {
      return null
    }

    // Sanitize any shared metadata the same way the backend would, dropping it
    // entirely if it is malformed so a bad fragment can't break restoration.
    if (payload.md !== undefined) {
      const sanitized = sanitizeRequestMetadata(payload.md)
      payload.md = sanitized.ok && Object.keys(sanitized.metadata).length > 0 ? sanitized.metadata : undefined
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Clear the share fragment from the URL without triggering a navigation.
 */
export function clearShareFragment(): void {
  if (window.location.hash.includes(SHARE_PREFIX)) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
