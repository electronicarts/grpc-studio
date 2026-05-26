// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Authentication Module Exports
 */

export { 
  AuthProvider, 
  AuthenticatedTemplate,
  UnauthenticatedTemplate
} from './components/AuthProvider';

export { useAuth } from './hooks/useAuth';
export { useAutoLogin } from './hooks/useAutoLogin';

export { initializeAuthFromYaml } from './api/authInitializer';

export {
  getMsalInstance, 
  getAuthConfig,
  isSsoEnabled,
  getLoginRequest,
  getTokenRequest
} from './stores/authState';

export type { AuthConfig, EntraIdConfig, UserInfo, AuthContextType, YamlAuthConfig } from './types';
