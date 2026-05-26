// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface YamlAuthConfig {
  enabled: boolean;
  provider: string;
  entraId?: {
    tenantId: string;
    clientId: string;
    redirectUri?: string;
    scopes?: string[];
    cloud?: string;
  };
}
