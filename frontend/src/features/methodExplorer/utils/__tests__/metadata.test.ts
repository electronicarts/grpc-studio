// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { rowsToMetadata, activeRowCount, metadataToRows } from '../metadata'
import type { MetadataRow } from '../../types'

describe('metadata editor utils', () => {
  describe('rowsToMetadata', () => {
    it('includes only enabled rows with a non-empty key, lowercasing keys', () => {
      const rows: MetadataRow[] = [
        { id: '1', key: 'X-Request-Id', value: 'abc', enabled: true },
        { id: '2', key: 'x-disabled', value: 'nope', enabled: false },
        { id: '3', key: '   ', value: 'empty-key', enabled: true },
        { id: '4', key: 'x-tenant', value: 'acme', enabled: true },
      ]

      expect(rowsToMetadata(rows)).toEqual({ 'x-request-id': 'abc', 'x-tenant': 'acme' })
    })

    it('lets later rows win on duplicate keys', () => {
      const rows: MetadataRow[] = [
        { id: '1', key: 'x-key', value: 'first', enabled: true },
        { id: '2', key: 'x-key', value: 'second', enabled: true },
      ]

      expect(rowsToMetadata(rows)).toEqual({ 'x-key': 'second' })
    })
  })

  describe('activeRowCount', () => {
    it('counts distinct enabled non-empty keys', () => {
      const rows: MetadataRow[] = [
        { id: '1', key: 'a', value: '1', enabled: true },
        { id: '2', key: 'b', value: '2', enabled: false },
        { id: '3', key: '', value: '3', enabled: true },
      ]

      expect(activeRowCount(rows)).toBe(1)
    })
  })

  describe('metadataToRows', () => {
    it('rebuilds enabled rows from a metadata map', () => {
      let n = 0
      const rows = metadataToRows({ 'x-a': '1', 'x-b': '2' }, () => `id_${++n}`)

      expect(rows).toEqual([
        { id: 'id_1', key: 'x-a', value: '1', enabled: true },
        { id: 'id_2', key: 'x-b', value: '2', enabled: true },
      ])
    })

    it('returns an empty list for missing metadata', () => {
      expect(metadataToRows(undefined, () => 'x')).toEqual([])
      expect(metadataToRows(null, () => 'x')).toEqual([])
    })
  })
})
