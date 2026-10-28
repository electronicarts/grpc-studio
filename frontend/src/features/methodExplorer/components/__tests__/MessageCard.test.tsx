// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MessageCard from '../MessageCard'
import {
  allScalarsSchema,
} from '../../../schemaRenderer/__tests__/protoMessageRenderer.fixtures'

vi.mock('../../stores', () => ({
  useMethodExplorerContext: () => ({ selectedTarget: 'test-target' }),
}))

vi.mock('../../../schemaLoader/lib/schemaCache', async () => {
  const { schemaCacheModule } = await import('@/test/schemaCacheMock')
  const { schemaCache } = await import('../../../schemaRenderer/__tests__/protoMessageRenderer.fixtures')
  return schemaCacheModule(schemaCache)
})

const renderCard = (props: Partial<React.ComponentProps<typeof MessageCard>> = {}) =>
  render(
    <MessageCard
      msg={{ stringField: 'hi', int32Field: 0, boolField: false }}
      originalIndex={1}
      isExpanded
      isLatest={false}
      schema={allScalarsSchema}
      isFormMode={false}
      onToggle={vi.fn()}
      {...props}
    />
  )

describe('MessageCard JSON view', () => {
  it('switches between the full message and its wire form', () => {
    const { container } = renderCard()
    const json = () => JSON.parse(container.querySelector('pre')!.textContent!)

    expect(json()).toEqual({ stringField: 'hi', int32Field: 0, boolField: false })

    fireEvent.click(screen.getByRole('button', { name: 'Wire' }))
    expect(json()).toEqual({ stringField: 'hi' })

    fireEvent.click(screen.getByRole('button', { name: 'Full' }))
    expect(json()).toEqual({ stringField: 'hi', int32Field: 0, boolField: false })
  })

  it('offers no wire view without a schema to encode with', () => {
    renderCard({ schema: null })
    expect(screen.queryByRole('button', { name: 'Wire' })).not.toBeInTheDocument()
  })
})
