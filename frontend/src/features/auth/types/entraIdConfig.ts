// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { AuthConfig } from '@/features/auth/types/authConfig'

export interface EntraIdConfig extends AuthConfig {
  tenantId: string
  postLogoutRedirectUri: string
  cloud?: 'public' | 'government' | 'china' | 'germany'
}
