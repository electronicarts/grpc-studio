// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { defineConfig, type ViteDevServer, type PreviewServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

function sendConfigNotFound(res: ServerResponse, requestUrl: string): void {
  res.statusCode = 503
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    error: 'Configuration file not found',
    message: `Config file not found: ${requestUrl}`,
  }))
}

function serveConfigFile(req: IncomingMessage, res: ServerResponse): void {
  const requestUrl = req.url ?? ''
  const configPath = path.resolve(__dirname, '../config', requestUrl.slice(1))

  if (!fs.existsSync(configPath)) {
    sendConfigNotFound(res, requestUrl)
    return
  }

  const content = fs.readFileSync(configPath, 'utf-8')
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.end(content)
}

// Plugin to serve config files for both dev and preview modes
const configServerPlugin = () => {
  return {
    name: 'config-server',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/config', serveConfigFile)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/config', serveConfigFile)
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), configServerPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@grpc-studio/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 4173,
    host: true,
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
