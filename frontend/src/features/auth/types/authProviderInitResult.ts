// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthConfig } from './authConfig';

export interface AuthProviderInitResult {
  config: AuthConfig;
  msalInstance: PublicClientApplication | null;
}
