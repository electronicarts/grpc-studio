// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * User Context Middleware
 * 
 * Extracts user information from SSO headers and makes it available
 * throughout the request lifecycle using AsyncLocalStorage for proper
 * request-scoped context (safe for concurrent requests).
 *
 * SECURITY: x-user-id / x-user-email / x-user-name are trusted as-is.
 * This is only safe when a trusted reverse proxy or SSO gateway sits in
 * front and strips any client-supplied versions of these headers before
 * forwarding requests. Do NOT expose this service directly to untrusted
 * clients without that layer in place.
 */

import type { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import type { IncomingHttpHeaders } from 'http';
import type { InvokeStreamUserHeaders } from '@grpc-studio/shared';
import type { UserContext } from '../types/index.js';

const userContextStorage = new AsyncLocalStorage<UserContext>();

interface StreamPayloadWithUserHeaders {
  userHeaders?: unknown;
}

/**
 * Extract user info from trusted proxy/SSO headers.
 */
export function getUserContextFromHeaders(headers: IncomingHttpHeaders): UserContext {
  const getHeader = (name: string): string | null => {
    const exact = headers[name];
    const v = exact ?? Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
    return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
  };

  const userId = getHeader('x-user-id');
  const userEmail = getHeader('x-user-email');
  const userName = getHeader('x-user-name');

  return userId || userEmail || userName
    ? {
      userId: userId || null,
      userEmail: userEmail || null,
      userName: userName || null,
      authenticated: true,
    }
    : {
      userId: null,
      userEmail: null,
      userName: null,
      authenticated: false,
    };
}

export function getUserHeadersFromStreamPayload(payload: StreamPayloadWithUserHeaders): InvokeStreamUserHeaders | null {
  if (!payload.userHeaders) return null;
  if (!isRecord(payload.userHeaders)) return null;

  const userHeaders: InvokeStreamUserHeaders = {};
  for (const [key, headerValue] of Object.entries(payload.userHeaders)) {
    if (headerValue === undefined) continue;
    if (typeof headerValue !== 'string') return null;

    switch (key.toLowerCase()) {
      case 'x-user-id':
        userHeaders['X-User-Id'] = headerValue;
        break;
      case 'x-user-email':
        userHeaders['X-User-Email'] = headerValue;
        break;
      case 'x-user-name':
        userHeaders['X-User-Name'] = headerValue;
        break;
      default:
        return null;
    }
  }

  return userHeaders;
}

export function getUserContextFromStreamPayload(payload: StreamPayloadWithUserHeaders): UserContext | null {
  const userHeaders = getUserHeadersFromStreamPayload(payload);
  if (!userHeaders) return null;

  return getUserContextFromHeaders({
    'x-user-id': userHeaders['X-User-Id'],
    'x-user-email': userHeaders['X-User-Email'],
    'x-user-name': userHeaders['X-User-Name'],
  });
}

/**
 * Middleware to extract user info from headers and forward as gRPC metadata.
 */
export function userContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userContext = getUserContextFromHeaders(req.headers);
  
  // Attach to request object
  req.userContext = userContext;
  
  // Run the rest of the request in AsyncLocalStorage context
  userContextStorage.run(userContext, () => {
    next();
  });
}

/**
 * Run a function with user context (for non-HTTP contexts like WebSocket).
 * Always runs inside AsyncLocalStorage so getCurrentUserContext() behaves
 * consistently with HTTP requests, even when unauthenticated.
 */
export function runWithUserContext<T>(userContext: Partial<UserContext> | null, fn: () => T): T {
  const context = (userContext && (userContext.userId || userContext.userEmail || userContext.userName))
    ? {
        userId: userContext.userId || null,
        userEmail: userContext.userEmail || null,
        userName: userContext.userName || null,
        authenticated: true
      }
    : {
        userId: null,
        userEmail: null,
        userName: null,
        authenticated: false
      };
  return userContextStorage.run(context, fn);
}

/**
 * Get the current user context (for use in services)
 */
export function getCurrentUserContext(): UserContext | null {
  return userContextStorage.getStore() ?? null;
}

/**
 * Get user ID from context (returns null if not authenticated)
 */
export function getCurrentUserId() {
  const context = userContextStorage.getStore();
  return context?.userId || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
