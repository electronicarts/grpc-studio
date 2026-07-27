// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MessageList from '../MessageList'

// MessageCard reads the method-explorer context for the target; stub it so the
// list can render standalone.
vi.mock('../../stores', () => ({
  useMethodExplorerContext: () => ({ selectedTarget: null }),
}))

function scrollContainer(container: HTMLElement): HTMLElement {
  // The scrollable list is the div carrying overflow-y-auto.
  const el = container.querySelector('.overflow-y-auto')
  if (!el) throw new Error('scroll container not found')
  return el as HTMLElement
}

describe('MessageList height', () => {
  it('applies the fixed maxHeight when not resizable', () => {
    const { container } = render(
      <MessageList messages={[{ a: 1 }]} maxHeight="max-h-80" />
    )
    const el = scrollContainer(container)
    expect(el.className).toContain('max-h-80')
    // No native resize affordance on fixed lists.
    expect(el.className).not.toContain('resize-y')
  })

  it('opens tall and is user-draggable when resizable', () => {
    const { container } = render(
      <MessageList messages={[{ a: 1 }]} maxHeight="max-h-80" resizable />
    )
    const el = scrollContainer(container)
    // Native vertical drag-resize with a floor and a viewport-relative ceiling,
    // ignoring the fixed compact cap.
    expect(el.className).toContain('resize-y')
    expect(el.className).toContain('min-h-40')
    expect(el.className).toContain('max-h-[85vh]')
    expect(el.className).not.toContain('max-h-80')
    // Default starting height is applied via inline style (the persisted source).
    expect(el.style.height).toBe('32rem')
  })
})
