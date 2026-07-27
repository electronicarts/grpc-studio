// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Common test fixtures and helper functions to reduce duplication across test files.
 */

import { mock } from 'node:test'
import { create } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema, FileDescriptorProtoSchema, DescriptorProtoSchema } from '@bufbuild/protobuf/wkt'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import type { CertificateRepository } from '../repositories/certificateRepository.js'
import type { CertificateMetadata } from '../types/index.js'
import configManager from '../config/configManager.js'

// ============================================================================
// Repository Mocks
// ============================================================================

/**
 * Creates a mock ReflectionSchemaRepository with common methods
 */
export function createMockReflectionRepository(overrides?: Partial<ReflectionSchemaRepository>): ReflectionSchemaRepository {
  return {
    listServices: mock.fn(async () => []),
    getFileRegistry: mock.fn(async () => ({
      getMessage: mock.fn(() => null),
      getService: mock.fn(() => null)
    })),
    getFileDescriptorSet: mock.fn(async () => create(FileDescriptorSetSchema, { file: [] })),
    ...overrides
  } as unknown as ReflectionSchemaRepository
}

/**
 * Creates a mock CertificateRepository with common methods
 */
export function createMockCertificateRepository(overrides?: Partial<CertificateRepository>): CertificateRepository {
  return {
    getCertificateMetadata: mock.fn(),
    clearCache: mock.fn(),
    ...overrides
  } as unknown as CertificateRepository
}

// ============================================================================
// Protobuf Message Fixtures
// ============================================================================

/**
 * Creates a proper protobuf FileDescriptorSet with the given files
 */
export function createFileDescriptorSet(fileNames: string[] = ['test.proto']) {
  const files = fileNames.map(name => create(FileDescriptorProtoSchema, {
    name,
    package: 'test',
    messageType: [],
    service: []
  }))

  return create(FileDescriptorSetSchema, { file: files })
}

/**
 * Creates a protobuf message descriptor with fields
 */
export function createMessageDescriptor(name: string, fields: Array<{ name: string; number: number; type: number }> = []) {
  return create(DescriptorProtoSchema, {
    name,
    field: fields
  })
}

/**
 * Creates a complete FileDescriptorSet with a message type
 */
export function createFileDescriptorSetWithMessage(
  fileName: string,
  packageName: string,
  messageName: string,
  fields: Array<{ name: string; number: number; type: number }> = []
) {
  const message = createMessageDescriptor(messageName, fields)

  const file = create(FileDescriptorProtoSchema, {
    name: fileName,
    package: packageName,
    messageType: [message],
    service: []
  })

  return create(FileDescriptorSetSchema, { file: [file] })
}

// ============================================================================
// Certificate Fixtures
// ============================================================================

/**
 * Creates certificate metadata for a valid certificate
 */
export function createValidCertificateMetadata(daysUntilExpiry: number = 90): CertificateMetadata {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry)

  return {
    subject: 'CN=Test Certificate',
    validFrom: new Date().toISOString(),
    validTo: expiryDate.toISOString()
  }
}

/**
 * Creates certificate metadata for an expired certificate
 */
export function createExpiredCertificateMetadata(daysExpired: number = 10): CertificateMetadata {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() - daysExpired)

  return {
    subject: 'CN=Expired Certificate',
    validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
    validTo: expiryDate.toISOString()
  }
}

// ============================================================================
// Config Manager Mocking
// ============================================================================

// Store original once at module load time
const originalGetTargets = configManager.getTargets

/**
 * Mocks configManager to return an mTLS target (multi-server config shape)
 *
 * Usage:
 *   beforeEach(() => mockMtlsConfig())
 *   afterEach(() => restoreConfigManager())
 */
export function mockMtlsConfig(): void {
  configManager.getTargets = () => [{
    name: 'mtls-target',
    mode: 'mtls' as const,
    host: 'localhost',
    port: 50051,
    rpc: { unaryDeadlineMs: 30000, streamDeadlineMs: 120000 },
    reflection: { deadlineMs: 25000 },
    keepalive: { pingIntervalMs: 30000, pingTimeoutMs: 10000 },
    maxReceiveMessageBytes: 104857600,
    security: {
      clientCertPath: '/path/to/cert.pem',
      clientKeyPath: '/path/to/key.pem',
      caCertPath: '/path/to/ca.pem'
    }
  }]
}

/**
 * Restores the original configManager.getTargets method
 */
export function restoreConfigManager(): void {
  configManager.getTargets = originalGetTargets
}

// ============================================================================
// Service Method Fixtures
// ============================================================================

/**
 * Creates a mock service descriptor with methods
 */
export function createMockServiceDescriptor(methods: Array<{
  name: string
  inputType: string
  outputType: string
  methodKind: 'unary' | 'server_streaming' | 'client_streaming' | 'bidi_streaming'
}>) {
  return {
    methods: methods.map(m => ({
      name: m.name,
      input: { typeName: m.inputType },
      output: { typeName: m.outputType },
      methodKind: m.methodKind
    }))
  }
}

/**
 * Creates a mock registry with a service
 */
export function createMockRegistry(serviceName: string, methods: ReturnType<typeof createMockServiceDescriptor>['methods']) {
  return {
    getMessage: mock.fn(() => null),
    getService: mock.fn((name: string) => {
      if (name === serviceName) {
        return { methods }
      }
      return null
    })
  }
}
