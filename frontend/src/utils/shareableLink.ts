// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Shareable link utilities for gRPC Studio.
 *
 * Encodes the current request state (service, method, request body)
 * into a URL-safe base64 hash fragment. Recipients can open the link
 * and the request is restored automatically.
 *
 * Format: #share=<base64url(JSON({s, m, r}))>
 *   s = service fullName
 *   m = method name
 *   r = request body (object)
 */

export interface SharedRequestState {
  /** Service fullName, e.g. "package.ServiceName" */
  s: string
  /** Method name */
  m: string
  /** Request body (parsed object) */
  r: Record<string, unknown>
}

const SHARE_PREFIX = 'share='

/**
 * Build a shareable URL for the current request.
 */
export function buildShareableUrl(
  serviceFullName: string,
  methodName: string,
  requestBody: Record<string, unknown>
): string {
  const payload: SharedRequestState = {
    s: serviceFullName,
    m: methodName,
    r: requestBody,
  }
  const json = JSON.stringify(payload)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

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
    // Restore standard base64 from URL-safe variant
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) base64 += '='

    const json = decodeURIComponent(escape(atob(base64)))
    const payload = JSON.parse(json) as SharedRequestState

    if (
      typeof payload.s !== 'string' ||
      typeof payload.m !== 'string' ||
      typeof payload.r !== 'object' ||
      payload.r === null
    ) {
      return null
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
