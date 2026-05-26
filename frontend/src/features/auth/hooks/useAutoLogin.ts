// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { createLogger } from '@/utils/debugLogger'

const logger = createLogger('Auth:AutoLogin')

/**
 * Auto-triggers SSO login when enabled and the user is not yet authenticated.
 */
export function useAutoLogin() {
  const { isAuthenticated, isLoading, isSsoEnabled, login } = useAuth()
  const loginAttempted = useRef(false)

  useEffect(() => {
    if (isSsoEnabled && !isAuthenticated && !isLoading && !loginAttempted.current) {
      loginAttempted.current = true
      login().catch((error) => {
        logger.error('Auto-login failed:', error)
        loginAttempted.current = false
      })
    }
  }, [isSsoEnabled, isAuthenticated, isLoading, login])

  return { isAuthenticated, isLoading, isSsoEnabled }
}
