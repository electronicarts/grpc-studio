// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback, useMemo, useState } from 'react'
import type { RequestMetadata } from '@grpc-studio/shared'
import type { MetadataModel, MetadataRow } from '../types'
import { activeRowCount, rowsToMetadata } from '../utils/metadata'

let rowIdCounter = 0
function nextRowId(): string {
  rowIdCounter += 1
  return `md_${rowIdCounter}`
}

export function useMetadataModel(restored?: MetadataRow[]): MetadataModel {
  const [rows, setRows] = useState<MetadataRow[]>(restored ?? [])

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { id: nextRowId(), key: '', value: '', enabled: true }])
  }, [])

  const updateRow = useCallback((id: string, patch: Partial<Pick<MetadataRow, 'key' | 'value' | 'enabled'>>) => {
    setRows(prev => prev.map(row => (row.id === id ? { ...row, ...patch } : row)))
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(row => row.id !== id))
  }, [])

  const toMetadata = useCallback((): RequestMetadata => rowsToMetadata(rows), [rows])

  const reset = useCallback(() => {
    setRows([])
  }, [])

  const activeCount = useMemo(() => activeRowCount(rows), [rows])

  return { rows, activeCount, addRow, updateRow, removeRow, setRows, toMetadata, reset }
}

export { nextRowId }
