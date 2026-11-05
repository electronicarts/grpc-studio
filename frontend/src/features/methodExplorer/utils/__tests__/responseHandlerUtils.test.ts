// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { wireResponseJson } from '@/features/methodExplorer/utils/responseHandlerUtils'
import { allScalarsSchema } from '@/test/protoMessageRenderer.fixtures'

vi.mock('@/features/schemaLoader/lib/schemaCache', async () => {
  const { schemaCacheModule } = await import('@/test/schemaCacheMock')
  const { schemaCache } = await import('@/test/protoMessageRenderer.fixtures')
  return schemaCacheModule(schemaCache)
})

describe('wireResponseJson', () => {
  const data = { stringField: 'hi', int32Field: 0 }

  it('keeps the response wrapper and swaps its message for the wire form', () => {
    const raw = JSON.stringify({ success: true, data, responseTime: '5ms' })
    expect(JSON.parse(wireResponseJson(raw, data, allScalarsSchema, 'test-target')!)).toEqual({
      success: true,
      data: { stringField: 'hi' },
      responseTime: '5ms',
    })
  })

  it('has no wire form for an error response', () => {
    const raw = JSON.stringify({ success: false, error: 'boom' })
    expect(wireResponseJson(raw, data, allScalarsSchema, 'test-target')).toBeNull()
  })
})
