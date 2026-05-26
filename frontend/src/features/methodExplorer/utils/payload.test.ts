// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { toWireFormat } from './payload'
import { schemaCache as testSchemaMap } from '../../schemaRenderer/__tests__/protoMessageRenderer.fixtures'

vi.mock('../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getCachedSchema: vi.fn((type: string) => testSchemaMap.get(type) ?? null),
  },
}))

describe('payload conversion', () => {
  it('keeps empty protobuf maps as JSON objects', () => {
    const payload = toWireFormat({ stringToString: {} }, 'test.MapFields')

    expect(payload.wire).toEqual({})
  })

  it('rejects array values for protobuf map fields', () => {
    expect(() => toWireFormat({ stringToString: [] }, 'test.MapFields'))
      .toThrow('expected object, got Array')
  })

  it('allows arbitrary JSON object keys for google.protobuf.Struct fields', () => {
    const payload = toWireFormat(
      { metadata: { dietary: ['grain-free'], priority: 3 } },
      'test.StructMessage',
    )

    expect(payload.wire).toEqual({
      metadata: { dietary: ['grain-free'], priority: 3 },
    })
  })
})
