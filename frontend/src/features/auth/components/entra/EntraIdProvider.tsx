// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  MsalProvider,
  useMsal,
  useIsAuthenticated,
} from '@azure/msal-react';
import {
  InteractionStatus,
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import { getLoginRequest, getTokenRequest } from '../../stores/authState';
import { setUserHeaders, clearUserHeaders } from '../../../../lib/headers/headerManager';
import type { UserInfo, AuthContextType } from '../../types';
import { AuthContext } from '../../stores/authContext';
import { createLogger } from '@/utils/debugLogger';

const logger = createLogger('Auth:EntraIdProvider');

function EntraIdInner({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  const extractUserInfo = useCallback((account: AccountInfo): UserInfo => ({
    id: account.localAccountId || account.homeAccountId,
    email: account.username,
    name: account.name || account.username,
    username: account.username,
    tenantId: account.tenantId,
  }), []);

  useEffect(() => {
    if (accounts.length > 0) {
      const userInfo = extractUserInfo(accounts[0]);
      setUser(userInfo);
      setUserHeaders({
        userId: userInfo.id,
        userEmail: userInfo.email,
        userName: userInfo.name,
      });
    } else {
      setUser(null);
      clearUserHeaders();
    }
  }, [accounts, extractUserInfo]);

  const login = useCallback(async () => {
    try {
      await instance.loginRedirect(getLoginRequest());
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }, [instance]);

  const logout = useCallback(async () => {
    try {
      const account = accounts[0];
      if (account) {
        await instance.logoutRedirect({
          account,
          postLogoutRedirectUri: window.location.origin,
        });
      }
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }, [instance, accounts]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (accounts.length === 0) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...getTokenRequest(),
        account: accounts[0],
      });
      setAccessToken(response.accessToken);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(getTokenRequest());
          setAccessToken(response.accessToken);
          return response.accessToken;
        } catch (popupError) {
          logger.error('Token acquisition failed (popup):', popupError);
          return null;
        }
      }
      logger.error('Token acquisition failed:', error);
      return null;
    }
  }, [instance, accounts]);

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      getAccessToken();
    }
  }, [isAuthenticated, accounts, getAccessToken]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    user,
    accessToken,
    login,
    logout,
    getAccessToken,
    isSsoEnabled: true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function EntraIdProvider({
  msalInstance,
  children,
}: {
  msalInstance: PublicClientApplication;
  children: ReactNode;
}) {
  return (
    <MsalProvider instance={msalInstance}>
      <EntraIdInner>{children}</EntraIdInner>
    </MsalProvider>
  );
}
