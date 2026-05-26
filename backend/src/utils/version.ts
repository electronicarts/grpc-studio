// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Application version — resolved once at startup from the npm_package_version
 * environment variable that npm injects when scripts run via `npm run ...`.
 * Falls back to '0.0.0' for direct `node` invocations without npm.
 */
export const APP_VERSION: string = process.env.npm_package_version ?? '0.0.0';
