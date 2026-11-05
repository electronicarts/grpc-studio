// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { PublicClientApplication } from '@azure/msal-browser'
import type { AuthConfig } from '@/features/auth/types/authConfig'

export interface AuthProviderInitResult {
  config: AuthConfig
  msalInstance: PublicClientApplication | null
}
