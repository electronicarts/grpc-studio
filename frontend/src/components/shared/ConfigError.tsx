// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { AlertPanel } from './AlertPanel'

interface ConfigErrorProps {
  message: string
}

export function ConfigError({ message }: ConfigErrorProps) {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <AlertPanel title="Configuration Error">
          <p className="text-red-700 dark:text-red-300 mb-4">
            The application could not start because the configuration file is missing or invalid:
          </p>
          <code className="block bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 p-3 rounded text-sm font-mono">
            {message}
          </code>
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            <p className="font-semibold mb-2">Required:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Configuration file must be available at <code>/config/frontend.yaml</code></li>
              <li>File must contain valid YAML with required fields</li>
              <li>In Kubernetes: Mount the config as a ConfigMap volume</li>
              <li>In Docker: Mount the config directory or file</li>
            </ul>
          </div>
        </AlertPanel>
      </div>
    </div>
  )
}
