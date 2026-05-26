// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Server as HttpServer } from 'http';
import type { WebSocketServer } from 'ws';
import logger from './logger.js';
import configManager from '../config/configManager.js';
import * as websocketServer from '../websocket/websocketServer.js';
import grpcMethodInvokerService from '../services/grpcMethodInvokerService.js';
import authManager from '../auth/authManager.js';
import { observabilityManager } from '../observability/observability.js';

const serverLogger = logger.child({ module: 'graceful-shutdown' });

interface ServerInstances {
  httpServer: HttpServer;
  wss?: WebSocketServer;
}

let isShuttingDown = false;
let isSetup = false;

export function setupGracefulShutdown(servers: ServerInstances): void {
  if (isSetup) return;
  isSetup = true;

  serverLogger.info('Setting up graceful shutdown');

  // Use `once` so handlers cannot stack if the function were somehow called again
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM', servers));
  process.once('SIGINT',  () => gracefulShutdown('SIGINT', servers));

  // SIGUSR2 is used by nodemon to trigger restarts — re-send after cleanup
  // so nodemon can proceed with the restart.
  process.once('SIGUSR2', async () => {
    await gracefulShutdown('SIGUSR2', servers, { exit: false });
    process.kill(process.pid, 'SIGUSR2');
  });

  process.on('uncaughtException', (error) => {
    serverLogger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    gracefulShutdown('uncaughtException', servers);
  });

  // Treat unhandled rejections the same as uncaught exceptions — both indicate
  // a programming error that left the process in an unknown state.
  process.on('unhandledRejection', (reason) => {
    serverLogger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    gracefulShutdown('unhandledRejection', servers);
  });

  serverLogger.info('Graceful shutdown setup completed');
}

async function gracefulShutdown(signal: string, servers: ServerInstances, { exit = true } = {}): Promise<void> {
  if (isShuttingDown) {
    serverLogger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }

  isShuttingDown = true;
  serverLogger.info(`Starting graceful shutdown (${signal})`);

  const timeoutMs = configManager.getServerConfig().shutdownGracePeriodMs;
  const shutdownTimeout = setTimeout(() => {
    serverLogger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, timeoutMs);

  try {
    await websocketServer.closeWebSocketServer(servers.wss ?? null);

    grpcMethodInvokerService.close();

    await authManager.cleanup();

    // Shutdown observability (flush metrics)
    await observabilityManager.shutdown();

    if (servers.httpServer) {
      await new Promise((resolve) => servers.httpServer.close(resolve));
      serverLogger.info('HTTP server closed');
    }

    clearTimeout(shutdownTimeout);
    serverLogger.info('Graceful shutdown completed');

    if (exit) process.exit(0);

  } catch (error) {
    serverLogger.error('Error during graceful shutdown', { error: error instanceof Error ? error.message : String(error) });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Check if server is shutting down
 * @returns {boolean}
 */
export function isServerShuttingDown() {
  return isShuttingDown;
}
