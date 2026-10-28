// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { wireResponseJson } from '../responseHandlerUtils'
import {
  allScalarsSchema,
  schemaCache as testSchemaMap,
} from '../../../schemaRenderer/__tests__/protoMessageRenderer.fixtures'

vi.mock('../../../schemaLoader/lib/schemaCache', () => ({
  schemaCache: {
    getCachedSchema: vi.fn((_target: string, type: string) => testSchemaMap.get(type) ?? null),
    getSchemaMap: vi.fn(() => testSchemaMap),
    getTargetSchemas: vi.fn(() => [...testSchemaMap.values()]),
  },
}))

describe('wireResponseJson', () => {
  const data = { stringField: 'hi', int32Field: 0 }

  it('keeps the response wrapper and swaps its message for the wire form', () => {
    const raw = JSON.stringify({ success: true, data, responseTime: '5ms' })
    expect(JSON.parse(wireResponseJson(raw, data, allScalarsSchema, 'test-target')!))
      .toEqual({ success: true, data: { stringField: 'hi' }, responseTime: '5ms' })
  })

  it('has no wire form for an error response', () => {
    const raw = JSON.stringify({ success: false, error: 'boom' })
    expect(wireResponseJson(raw, data, allScalarsSchema, 'test-target')).toBeNull()
  })
})
