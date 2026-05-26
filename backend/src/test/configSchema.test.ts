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
      target: {
        port: 50051,
      },
    })

    assert.equal(result.success, false)
    assert.match(formatIssues(result), /client\.target\.host is required/)
  })

  it('accepts explicitly configured hosts', () => {
    assert.equal(serverSchema.ServerSchema.safeParse({
      host: '0.0.0.0',
      port: 3001,
    }).success, true)

    assert.equal(clientSchema.ClientSchema.safeParse({
      target: {
        host: 'localhost',
        port: 50051,
      },
    }).success, true)
  })

  it('requires the HTTP response timeout to exceed the reflection deadline', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grpc-studio-config-'))
    const configPath = path.join(tempDir, 'backend.yaml')

    try {
      fs.writeFileSync(configPath, [
        'server:',
        '  host: 127.0.0.1',
        '  http:',
        '    responseTimeoutMs: 1000',
        'client:',
        '  target:',
        '    host: localhost',
        '  reflection:',
        '    deadlineMs: 1000',
      ].join('\n'))

      assert.throws(() => loadConfig({
        configPath,
        logConfig: false,
        env: {},
      }), /server\.http\.responseTimeoutMs \(1000\) must be greater than client\.reflection\.deadlineMs \(1000\)/)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('requires client certificate and key paths for mTLS mode', () => {
    const result = clientSchema.ClientSchema.safeParse({
      mode: 'mtls',
      target: {
        host: 'localhost',
        port: 50051,
      },
    })

    assert.equal(result.success, false)
    const issues = formatIssues(result)
    assert.match(issues, /mTLS mode requires client\.security\.clientCertPath/)
    assert.match(issues, /mTLS mode requires client\.security\.clientKeyPath/)
  })

  it('accepts mTLS mode with client certificate and key paths', () => {
    const result = clientSchema.ClientSchema.safeParse({
      mode: 'mtls',
      target: {
        host: 'localhost',
        port: 50051,
      },
      security: {
        clientCertPath: '/certs/client.pem',
        clientKeyPath: '/certs/client.key',
      },
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
        '  target:',
        '    host: yaml-host',
      ].join('\n'))

      const config = loadConfig({
        configPath,
        logConfig: false,
        env: {
          PORT: '4100',
          GRPC_TARGET_HOST: 'env-host',
          TARGET_HOST: 'legacy-env-host',
          GRPC_TARGET_PORT: '6000',
          GRPC_UNARY_DEADLINE_MS: '1234',
          GRPC_REFLECTION_DEADLINE_MS: '2345',
          CERT_WARN_DAYS_WARNING: '45',
        },
      })

      assert.equal(config.server.port, 4100)
      assert.equal(config.client.target.host, 'env-host')
      assert.equal(config.client.target.port, 6000)
      assert.equal(config.client.rpc.unaryDeadlineMs, 1234)
      assert.equal(config.client.reflection.deadlineMs, 2345)
      assert.equal(config.certificate.warnDaysWarning, 45)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

function formatIssues(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string {
  return result.success ? '' : result.error?.issues.map(issue => issue.message).join('\n') ?? ''
}
