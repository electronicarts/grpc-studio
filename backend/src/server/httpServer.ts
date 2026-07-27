// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { createServer } from 'http';
import { pathToFileURL } from 'url';
import configManager from '../config/configManager.js';
import multiClientManager from '../grpc/multiClientManager.js';
import certificateRefreshWorker from '../workers/certificateRefreshWorker.js';
import logger from '../utils/logger.js';
import * as version from '../utils/version.js';
import * as appModule from '../app.js';
import * as websocketServer from '../websocket/websocketServer.js';
import * as gracefulShutdown from '../utils/gracefulShutdown.js';
import authManager from '../auth/authManager.js';
import { observabilityManager } from '../observability/observability.js';

const httpServerLogger = logger.child({ module: 'http-server' });

interface StartHttpServerOptions {
  initializeObservability?: boolean;
}

/**
 * Initialize and start the gRPC Studio HTTP server.
 * @returns {Promise<Object>} Server instances { httpServer, wss }
 */
export async function startHttpServer(options: StartHttpServerOptions = {}) {
  try {
    const { initializeObservability = true } = options;

    httpServerLogger.info('Initializing gRPC Studio HTTP server', {
      version: version.APP_VERSION,
      nodeVersion: process.version,
    });

    if (initializeObservability) {
      // Direct imports of this module still initialize observability here. The
      // normal process entrypoint initializes it earlier, before app imports.
      observabilityManager.initialize(configManager.getObservabilityConfig());
    }

    await authManager.initialize(configManager.getAuthConfig());

    // Initialize multi-client manager for all configured targets
    await multiClientManager.initialize();
    httpServerLogger.info('Initialized multi-client manager', {
      targets: multiClientManager.getTargetNames(),
    });

    // Start background certificate refresh worker (non-blocking)
    await certificateRefreshWorker.start();

    // Create Express app
    const app = appModule.createExpressApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Create WebSocket server
    const wss = websocketServer.createWebSocketServer(httpServer);

    // Setup graceful shutdown
    const servers = { httpServer, wss };
    gracefulShutdown.setupGracefulShutdown(servers);

    // Start listening on the configured host (not hardcoded '0.0.0.0')
    const serverConfig = configManager.getServerConfig();
    const targets = configManager.getTargets();

    await new Promise<void>((resolve, reject) => {
      httpServer.listen(serverConfig.port, serverConfig.host, () => {
        httpServerLogger.info('gRPC Studio HTTP server started', {
          pid: process.pid,
          url: `http://${serverConfig.host}:${serverConfig.port}`,
          wsUrl: `ws://${serverConfig.host}:${serverConfig.port}/ws/grpc`,
          authPlugin: authManager.getCurrentPluginName(),
          targetCount: targets.length,
          targets: targets.map(t => ({ name: t.name, address: `${t.host}:${t.port}`, mode: t.mode })),
        });
        resolve();
      });

      httpServer.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
          httpServerLogger.error(`Port ${serverConfig.port} is already in use`);
        } else {
          httpServerLogger.error('HTTP server error', { error: error.message });
        }
        reject(error);
      });
    });

    return servers;

  } catch (error) {
    httpServerLogger.error('Failed to start HTTP server', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Start HTTP server if this file is run directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startHttpServer().catch((error) => {
    httpServerLogger.error('Failed to start HTTP server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}

// Re-export for external use
export { createExpressApp } from '../app.js';
export { createWebSocketServer, closeWebSocketServer } from '../websocket/websocketServer.js';
export { setupGracefulShutdown, isServerShuttingDown } from '../utils/gracefulShutdown.js';
