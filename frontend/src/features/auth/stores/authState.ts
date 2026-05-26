// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthConfig } from '../types';

// ── singleton state ─────────────────────────────────────────────

let authConfig: AuthConfig | null = null;
let msalInstance: PublicClientApplication | null = null;
const DEFAULT_AUTH_SCOPES = ['openid', 'profile', 'email'];

export const setAuthState = (config: AuthConfig, msal: PublicClientApplication | null): void => {
  authConfig = config;
  msalInstance = msal;
};

export const getAuthConfig = (): AuthConfig | null => authConfig;

export const getMsalInstance = (): PublicClientApplication | null => msalInstance;

export const isSsoEnabled = (): boolean =>
  authConfig?.enabled === true && msalInstance !== null;

const getAuthRequest = () => ({
  scopes: authConfig?.scopes || DEFAULT_AUTH_SCOPES,
});

export const getLoginRequest = getAuthRequest;

export const getTokenRequest = getAuthRequest;
