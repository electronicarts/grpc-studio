// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetadataEditor from '../MetadataEditor'
import type { MetadataModel, MetadataRow } from '../../types'

function model(rows: MetadataRow[]): MetadataModel {
  return {
    rows,
    activeCount: rows.length,
    addRow: vi.fn(),
    updateRow: vi.fn(),
    removeRow: vi.fn(),
    setRows: vi.fn(),
    toMetadata: vi.fn(() => ({})),
    reset: vi.fn(),
  }
}

describe('MetadataEditor', () => {
  it('prompts for a base64 value on binary (-bin) keys only', () => {
    render(
      <MetadataEditor
        metadata={model([
          { id: '1', key: 'x-request-id', value: '', enabled: true },
          { id: '2', key: 'X-Trace-Bin', value: '', enabled: true },
        ])}
      />
    )

    expect(screen.getAllByPlaceholderText('value')).toHaveLength(1)
    expect(screen.getAllByPlaceholderText('base64 value')).toHaveLength(1)
  })
})
