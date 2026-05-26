// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { InvokeStreamUserHeaders } from '@grpc-studio/shared'
import { createLogger } from '../../utils/debugLogger'

const logger = createLogger('UserHeaders')

export interface UserHeaderSource {
  userId?: string | null
  userEmail?: string | null
  userName?: string | null
}

export type UserHeaders = InvokeStreamUserHeaders

let globalUserHeaders: UserHeaders = {}

export function setUserHeaders(user: UserHeaderSource): void {
  globalUserHeaders = {}
  if (user.userId) globalUserHeaders['X-User-Id'] = user.userId
  if (user.userEmail) globalUserHeaders['X-User-Email'] = user.userEmail
  if (user.userName) globalUserHeaders['X-User-Name'] = user.userName
  logger.info('User headers updated', { headerNames: Object.keys(globalUserHeaders) })
}

export function clearUserHeaders(): void {
  globalUserHeaders = {}
}

export function getUserHeaders(): UserHeaders {
  return { ...globalUserHeaders }
}

export function getHttpRequestHeaders(
  baseHeaders: Record<string, string> = {},
  requestHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    ...baseHeaders,
    ...globalUserHeaders,
    ...requestHeaders,
  }
}
