// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { AlertPanel } from './AlertPanel'

interface ConfigErrorProps {
  message: string
}

export function ConfigError({ message }: ConfigErrorProps) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <AlertPanel title="Configuration Error">
          <p className="mb-4 text-danger">
            The application could not start because the configuration file is missing or invalid:
          </p>
          <code className="block rounded bg-danger/10 p-3 font-mono text-sm text-danger">
            {message}
          </code>
          <div className="mt-4 text-sm text-danger">
            <p className="mb-2 font-semibold">Required:</p>
            <ul className="list-inside list-disc space-y-1">
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
