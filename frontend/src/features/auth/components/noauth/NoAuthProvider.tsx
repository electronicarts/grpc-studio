// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { ReactNode } from 'react';
import type { AuthContextType } from '../../types';
import { AuthContext } from '../../stores/authContext';

export function NoAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextType = {
    isAuthenticated: true,
    isLoading: false,
    user: null,
    accessToken: null,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => null,
    isSsoEnabled: false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
