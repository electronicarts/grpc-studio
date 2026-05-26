// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { UserInfo } from './userInfo';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  isSsoEnabled: boolean;
}
