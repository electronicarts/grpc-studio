// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { vi } from 'vitest'
import type { DescMessage } from '@bufbuild/protobuf'

/**
 * A stand-in for the schemaCache module that serves the given schemas by type name, for any target.
 * Use from a vi.mock factory, which runs before imports:
 *
 *   vi.mock('…/schemaLoader/lib/schemaCache', async () => {
 *     const { schemaCacheModule } = await import('@/test/schemaCacheMock')
 *     const { schemaCache } = await import('@/test/protoMessageRenderer.fixtures')
 *     return schemaCacheModule(schemaCache)
 *   })
 */
export function schemaCacheModule(schemas: ReadonlyMap<string, DescMessage> = new Map()) {
  return {
    schemaCache: {
      getSchema: vi.fn(async (_target: string, type: string) => schemas.get(type) ?? null),
      getCachedSchema: vi.fn((_target: string, type: string) => schemas.get(type) ?? null),
      getTargetSchemas: vi.fn(() => [...schemas.values()]),
      subscribe: vi.fn(() => () => {}),
      getVersion: vi.fn(() => 0),
      allLoaded: true,
    },
  }
}
