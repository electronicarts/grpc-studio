// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { loadConfig } from '../config/configLoader.js'
import * as serverSchema from '../config/schemas/serverSchema.js'
import * as clientSchema from '../config/schemas/clientSchema.js'

describe('config schemas', () => {
  it('requires the backend bind host to be supplied', () => {
    const result = serverSchema.ServerSchema.safeParse({
      port: 3001,
    })

    assert.equal(result.success, false)
    assert.match(formatIssues(result), /server\.host is required/)
  })

  it('requires the gRPC target host to be supplied', () => {
    const result = clientSchema.ClientSchema.safeParse({
      targets: [
        {
          name: 'target-1',
          port: 50051,
        },
      ],
    })

    assert.equal(result.success, false)
    assert.match(formatIssues(result), /target\.host is required/)
  })

  it('accepts explicitly configured hosts', () => {
    assert.equal(serverSchema.ServerSchema.safeParse({
      host: '0.0.0.0',
      port: 3001,
    }).success, true)

    assert.equal(clientSchema.ClientSchema.safeParse({
      targets: [
        {
          name: 'target-1',
          host: 'localhost',
          port: 50051,
        },
      ],
    }).success, true)
  })

  it('requires at least one configured target', () => {
    const result = clientSchema.ClientSchema.safeParse({
      targets: [],
    })

    assert.equal(result.success, false)
    assert.match(formatIssues(result), /At least one target is required/)
  })

  it('requires client certificate and key paths for mTLS mode', () => {
    const result = clientSchema.ClientSchema.safeParse({
      targets: [
        {
          name: 'target-1',
          mode: 'mtls',
          host: 'localhost',
          port: 50051,
        },
      ],
    })

    assert.equal(result.success, false)
    const issues = formatIssues(result)
    assert.match(issues, /mTLS mode requires security\.clientCertPath/)
    assert.match(issues, /mTLS mode requires security\.clientKeyPath/)
  })

  it('accepts mTLS mode with client certificate and key paths', () => {
    const result = clientSchema.ClientSchema.safeParse({
      targets: [
        {
          name: 'target-1',
          mode: 'mtls',
          host: 'localhost',
          port: 50051,
          security: {
            clientCertPath: '/certs/client.pem',
            clientKeyPath: '/certs/client.key',
          },
        },
      ],
    })

    assert.equal(result.success, true)
  })

  it('applies environment overrides before Zod parses the app config', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grpc-studio-config-'))
    const configPath = path.join(tempDir, 'backend.yaml')

    try {
      fs.writeFileSync(configPath, [
        'server:',
        '  host: 127.0.0.1',
        'client:',
        '  targets:',
        '    - name: target-1',
        '      host: yaml-host',
      ].join('\n'))

      const config = loadConfig({
        configPath,
        logConfig: false,
        env: {
          PORT: '4100',
          GRPC_TARGET_HOST: 'env-host',
          GRPC_TARGET_PORT: '6000',
          CERT_WARN_DAYS_WARNING: '45',
        },
      })

      assert.equal(config.server.port, 4100)
      assert.equal(config.client.targets[0].host, 'env-host')
      assert.equal(config.client.targets[0].port, 6000)
      assert.equal(config.certificate.warnDaysWarning, 45)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

function formatIssues(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string {
  return result.success ? '' : result.error?.issues.map(issue => issue.message).join('\n') ?? ''
}
