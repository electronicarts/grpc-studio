// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearUserHeaders,
  getHttpRequestHeaders,
  getUserHeaders,
  setUserHeaders,
} from '../headerManager'

describe('headerManager', () => {
  beforeEach(() => {
    clearUserHeaders()
  })

  it('stores frontend user identity headers', () => {
    setUserHeaders({
      userId: 'user-1',
      userEmail: 'ada@example.com',
      userName: 'Ada',
    })

    expect(getUserHeaders()).toEqual({
      'X-User-Id': 'user-1',
      'X-User-Email': 'ada@example.com',
      'X-User-Name': 'Ada',
    })
  })

  it('combines user headers with HTTP request headers', () => {
    setUserHeaders({ userId: 'user-1' })

    expect(getHttpRequestHeaders(
      { 'Content-Type': 'application/json' },
      { 'X-Request-Id': 'request-1' },
    )).toEqual({
      'Content-Type': 'application/json',
      'X-User-Id': 'user-1',
      'X-Request-Id': 'request-1',
    })
  })
})
