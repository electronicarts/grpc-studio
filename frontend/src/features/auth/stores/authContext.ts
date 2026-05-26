// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createContext } from 'react';
import type { AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: async () => null,
  isSsoEnabled: false,
});
