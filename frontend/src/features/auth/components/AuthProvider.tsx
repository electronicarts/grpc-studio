// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * AuthProvider — conditional wrapper that selects the right provider.
 */

import { ReactNode } from 'react';
import { getMsalInstance, isSsoEnabled } from '../stores/authState';
import { EntraIdProvider } from './entra/EntraIdProvider';
import { NoAuthProvider } from './noauth/NoAuthProvider';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';

export function AuthProvider({ children }: { children: ReactNode }) {
  const msalInstance = getMsalInstance();
  const ssoEnabled = isSsoEnabled();

  if (!ssoEnabled || !msalInstance) {
    return <NoAuthProvider>{children}</NoAuthProvider>;
  }

  return (
    <EntraIdProvider msalInstance={msalInstance}>
      {children}
    </EntraIdProvider>
  );
}

export { AuthenticatedTemplate, UnauthenticatedTemplate };
