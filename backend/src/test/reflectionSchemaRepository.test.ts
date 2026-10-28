// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { FileRegistry } from '@bufbuild/protobuf'
import { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import { fileDescriptor, fileRegistry } from './protoFixtures.js'

function serviceRegistry(pkg: string, message: string): FileRegistry {
  return fileRegistry(fileDescriptor({ name: `${pkg}.proto`, package: pkg, messageType: [{ name: message, nestedType: [{ name: 'Inner' }] }] }))
}

/** A repository whose reflection lookups are stubbed: `services` maps a service name to its registry. */
function repositoryWith(services: Record<string, FileRegistry | Error>) {
  const repo = new ReflectionSchemaRepository()
  repo.listServices = mock.fn(async () => Object.keys(services))
  const getFileRegistry = mock.fn(async (_target: string, service: string) => {
    const result = services[service]
    if (result instanceof Error) throw result
    return result
  })
  repo.getFileRegistry = getFileRegistry
  return { repo, getFileRegistry }
}

describe('ReflectionSchemaRepository.getTargetRegistry', () => {
  afterEach(() => new ReflectionSchemaRepository().clearCache())

  it("merges every service's types, nested ones included, with the well-known types", async () => {
    const { repo } = repositoryWith({ 'a.ServiceA': serviceRegistry('a', 'Alpha'), 'b.ServiceB': serviceRegistry('b', 'Beta') })

    const registry = await repo.getTargetRegistry('target-1')

    assert.ok(registry.getMessage('a.Alpha'))
    assert.ok(registry.getMessage('b.Beta.Inner'))
    assert.ok(registry.getMessage('google.protobuf.Timestamp'))
  })

  it('builds the registry once per target and reuses it', async () => {
    const { repo, getFileRegistry } = repositoryWith({ 'a.ServiceA': serviceRegistry('a', 'Alpha') })

    const first = await repo.getTargetRegistry('target-2')
    const second = await repo.getTargetRegistry('target-2')

    assert.equal(first, second)
    assert.equal(getFileRegistry.mock.callCount(), 1)
  })

  it('skips a service whose schema cannot be loaded', async () => {
    const { repo } = repositoryWith({ 'a.ServiceA': serviceRegistry('a', 'Alpha'), 'broken.Service': new Error('reflection failed') })

    const registry = await repo.getTargetRegistry('target-3')

    assert.ok(registry.getMessage('a.Alpha'))
  })

  it('keeps targets apart and rebuilds after the target cache is cleared', async () => {
    const one = repositoryWith({ 'a.ServiceA': serviceRegistry('a', 'Alpha') })
    const two = repositoryWith({ 'b.ServiceB': serviceRegistry('b', 'Beta') })

    assert.ok((await one.repo.getTargetRegistry('target-4')).getMessage('a.Alpha'))
    assert.equal((await two.repo.getTargetRegistry('target-5')).getMessage('a.Alpha'), undefined)

    one.repo.clearCache('target-4')
    await one.repo.getTargetRegistry('target-4')
    assert.equal(one.getFileRegistry.mock.callCount(), 2)
  })
})
