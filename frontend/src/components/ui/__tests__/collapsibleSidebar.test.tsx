// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollapsibleSidebar } from '../collapsibleSidebar'

function renderSidebar(overrides: Partial<React.ComponentProps<typeof CollapsibleSidebar>> = {}) {
  const onExpand = vi.fn()
  const props: React.ComponentProps<typeof CollapsibleSidebar> = {
    sidebar: <div>Sidebar Content</div>,
    children: <div>Main Content</div>,
    collapsed: false,
    onExpand,
    ...overrides,
  }
  const utils = render(<CollapsibleSidebar {...props} />)
  return { onExpand, ...utils }
}

describe('CollapsibleSidebar', () => {
  it('renders both sidebar and main content when expanded', () => {
    renderSidebar()
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()
    // No expand button while the sidebar is already visible.
    expect(screen.queryByRole('button', { name: /expand services panel/i })).not.toBeInTheDocument()
  })

  it('hides the sidebar content and shows an expand button when collapsed', () => {
    const { onExpand } = renderSidebar({ collapsed: true })

    expect(screen.queryByText('Sidebar Content')).not.toBeInTheDocument()
    expect(screen.getByText('Main Content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand services panel/i }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })
})
