// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { AuthConfig } from './authConfig';

export interface EntraIdConfig extends AuthConfig {
  tenantId: string;
  postLogoutRedirectUri: string;
  cloud?: 'public' | 'government' | 'china' | 'germany';
}
