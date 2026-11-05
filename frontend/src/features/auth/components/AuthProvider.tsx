// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * AuthProvider — conditional wrapper that selects the right provider.
 */

import { ReactNode } from 'react'
import { getMsalInstance, isSsoEnabled } from '@/features/auth/stores/authState'
import { EntraIdProvider } from '@/features/auth/components/entra/EntraIdProvider'
import { NoAuthProvider } from '@/features/auth/components/noauth/NoAuthProvider'

export function AuthProvider({ children }: { children: ReactNode }) {
  const msalInstance = getMsalInstance()
  const ssoEnabled = isSsoEnabled()

  if (!ssoEnabled || !msalInstance) {
    return <NoAuthProvider>{children}</NoAuthProvider>
  }

  return <EntraIdProvider msalInstance={msalInstance}>{children}</EntraIdProvider>
}
