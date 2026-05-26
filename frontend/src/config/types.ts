// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export interface FrontendConfig {
  api: {
    baseUrl: string;
    endpoints: {
      config: string;
      discover: string;
      invoke: string;
      descriptorSet: string;
      status: string;
      health: string;
    };
    timeout: number;
    websocketTimeout?: number;
  };
  auth?: {
    enabled: boolean;
    provider: string;
    entraId?: {
      tenantId: string;
      clientId: string;
      redirectUri?: string;
      scopes?: string[];
      cloud?: string;
    };
  };
}
